/* LIFORA Full Vault Backup Engine 3.0 — desktop-only, Node.js runtime.
 * Independent of Obsidian's portable data mirror. Back up every normal file,
 * including .obsidian and attachments, preserving empty directories.
 * Full replacement is an OFFLINE operation: close Obsidian and pause Syncthing.
 */
"use strict";
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const SCHEMA = 3;
const PREFIX = 'LIFORA-FULL-';
const MANIFEST = 'manifest.json';
const safeRelative = value => typeof value === 'string' && value.length > 0 &&
  !path.isAbsolute(value) && !value.includes('\\') &&
  value.split('/').every(part => part !== '' && part !== '.' && part !== '..' && !part.includes(':'));
const inside = (root, item) => {
  const normalize = value => process.platform === 'win32' ? value.toLowerCase() : value;
  root = normalize(root); item = normalize(item);
  return item === root || item.startsWith(root + path.sep);
};
const requireAbsolute = value => {
  if (!value || !path.isAbsolute(value)) throw new Error('Choose an absolute computer folder path.');
  return path.resolve(value);
};
function validateDestination(vaultRoot, backupRoot) {
  const vault = requireAbsolute(vaultRoot);
  const root = requireAbsolute(backupRoot);
  const canonical = value => { try { return fs.realpathSync.native(value); } catch { return value; } };
  if (inside(vault, root) || inside(canonical(vault), canonical(root)))
    throw new Error('Backup destination cannot be inside the Vault. Choose another folder or drive.');
  if (path.parse(root).root === root) throw new Error('Choose a dedicated backup folder, not the entire drive root.');
  return { vault, root };
}
async function inspectTree(root) {
  const files = [], directories = [];
  async function visit(folder, relative = '') {
    const children = await fsp.readdir(folder, {withFileTypes:true});
    children.sort((a,b)=>a.name.localeCompare(b.name));
    for (const item of children) {
      if (item.isSymbolicLink()) throw new Error(`Symlink is not supported in a complete snapshot: ${relative}/${item.name}`);
      const child = relative ? `${relative}/${item.name}` : item.name;
      if (!safeRelative(child)) throw new Error(`Unsafe vault path: ${child}`);
      const absolute = path.join(root, ...child.split('/'));
      if (item.isDirectory()) { directories.push(child); await visit(absolute, child); }
      else if (item.isFile()) files.push(child);
      else throw new Error(`Unsupported filesystem node: ${child}`);
    }
  }
  await visit(root);
  return { files, directories };
}
async function digest(filename) {
  return new Promise((resolve,reject)=>{
    const hash=crypto.createHash('sha256');
    const stream=fs.createReadStream(filename);
    stream.on('data',block=>hash.update(block));
    stream.on('error',reject);
    stream.on('end',()=>resolve(hash.digest('hex')));
  });
}
async function ensureDir(target){ await fsp.mkdir(target,{recursive:true}); }
async function verifiedCopy(source, target) {
  const before = await fsp.stat(source);
  await ensureDir(path.dirname(target));
  await fsp.copyFile(source,target);
  const [after, dest, sourceHash, destHash] = await Promise.all([
    fsp.stat(source), fsp.stat(target), digest(source), digest(target)
  ]);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
      sourceHash !== destHash) {
    throw new Error(`Source changed during backup or verification failed: ${source}`);
  }
  return { size:dest.size, sha256:destHash };
}
async function listBackups(vaultRoot, backupRoot) {
  const {root}=validateDestination(vaultRoot,backupRoot);
  try { await fsp.access(root); } catch { return []; }
  const result=[];
  for (const item of await fsp.readdir(root,{withFileTypes:true})) {
    if (!item.isDirectory() || !/^LIFORA-FULL-[0-9TZ-]+-[0-9a-f]{8}$/.test(item.name)) continue;
    const folder=path.join(root,item.name);
    try {
      const manifest=JSON.parse(await fsp.readFile(path.join(folder,MANIFEST),'utf8'));
      if (manifest.schemaVersion!==SCHEMA || manifest.snapshotType!=='full-vault') continue;
      result.push({id:item.name,path:folder,createdAt:manifest.createdAt,fileCount:manifest.fileCount,totalBytes:manifest.totalBytes});
    } catch { /* An incomplete backup is never listed as restorable. */ }
  }
  return result.sort((a,b)=>b.id.localeCompare(a.id));
}
async function verifyBackup(vaultRoot,backupRoot,id) {
  const {root}=validateDestination(vaultRoot,backupRoot);
  if (typeof id!=='string' || !/^LIFORA-FULL-[0-9TZ-]+-[0-9a-f]{8}$/.test(id)) throw new Error('Invalid backup ID.');
  const backupPath=path.join(root,id);
  const actual=await fsp.realpath(backupPath);
  if (!inside(await fsp.realpath(root),actual)) throw new Error('Backup path escapes the selected folder.');
  const manifest=JSON.parse(await fsp.readFile(path.join(actual,MANIFEST),'utf8'));
  if (manifest.schemaVersion!==SCHEMA || manifest.snapshotType!=='full-vault' || !Array.isArray(manifest.entries) ||
    !Array.isArray(manifest.directories) || manifest.algorithm!=='sha256') throw new Error('Unsupported full backup format.');
  if (manifest.fileCount!==manifest.entries.length) throw new Error('Backup manifest file count is wrong.');
  const expected=new Set(), folded=new Set();
  let bytes=0;
  for (const item of manifest.entries) {
    if (!safeRelative(item.path) || expected.has(item.path) || folded.has(item.path.toLowerCase())) throw new Error(`Unsafe or duplicate path in backup: ${item.path}`);
    expected.add(item.path); folded.add(item.path.toLowerCase());
    if (!Number.isSafeInteger(item.size) || item.size<0 || !/^[0-9a-f]{64}$/.test(item.sha256)) throw new Error('Invalid checksum manifest.');
    const filename=path.join(actual,'content',...item.path.split('/'));
    const stat=await fsp.lstat(filename);
    if (!stat.isFile() || stat.size!==item.size || await digest(filename)!==item.sha256) throw new Error(`Backup integrity check failed: ${item.path}`);
    bytes+=item.size;
  }
  if (bytes!==manifest.totalBytes) throw new Error('Backup total size mismatch.');
  for (const dir of manifest.directories) {
    if (!safeRelative(dir) || !(await fsp.stat(path.join(actual,'content',...dir.split('/')))).isDirectory()) throw new Error(`Missing folder: ${dir}`);
  }
  const inventory=await inspectTree(path.join(actual,'content'));
  if (inventory.files.length!==expected.size || inventory.files.some(file=>!expected.has(file))) throw new Error('Backup contains unexpected or missing files.');
  if (inventory.directories.length!==manifest.directories.length || inventory.directories.some(dir=>!manifest.directories.includes(dir))) throw new Error('Backup folder inventory mismatch.');
  return { id, path:actual, manifest, checked:expected.size };
}
async function createBackup(vaultRoot, backupRoot, retention=3) {
  const {vault,root}=validateDestination(vaultRoot,backupRoot);
  if (!(await fsp.stat(vault)).isDirectory()) throw new Error('Vault directory was not found.');
  if (!Number.isInteger(retention) || retention!==3) throw new Error('Only three rotating backups are supported.');
  await ensureDir(root);
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const id=`${PREFIX}${stamp}-${crypto.randomBytes(4).toString('hex')}`;
  const pending=path.join(root,`.pending-${id}`), final=path.join(root,id);
  await ensureDir(path.join(pending,'content'));
  try {
    const inventory=await inspectTree(vault);
    for (const folder of inventory.directories) await ensureDir(path.join(pending,'content',...folder.split('/')));
    let totalBytes=0;
    const entries=[];
    for (const name of inventory.files) {
      const copied=await verifiedCopy(path.join(vault,...name.split('/')),path.join(pending,'content',...name.split('/')));
      entries.push({path:name,...copied}); totalBytes+=copied.size;
    }
    const manifest={schemaVersion:SCHEMA,snapshotType:'full-vault',algorithm:'sha256',
      createdAt:new Date().toISOString(),vaultName:path.basename(vault),fileCount:entries.length,totalBytes,
      directories:inventory.directories,entries};
    await fsp.writeFile(path.join(pending,MANIFEST),JSON.stringify(manifest,null,2),'utf8');
    // Completely verify the pending snapshot before publishing it.
    const read=JSON.parse(await fsp.readFile(path.join(pending,MANIFEST),'utf8'));
    for(const entry of read.entries) {
      const target=path.join(pending,'content',...entry.path.split('/'));
      if(await digest(target)!==entry.sha256) throw new Error(`Snapshot verification failed: ${entry.path}`);
    }
    await fsp.rename(pending,final);
    const backups=await listBackups(vault,root);
    for(const old of backups.slice(retention)) await fsp.rm(old.path,{recursive:true,force:true});
    return {id,path:final,fileCount:entries.length,totalBytes};
  } catch(error) {
    await fsp.rm(pending,{recursive:true,force:true}).catch(()=>{});
    throw error;
  }
}
// Offline exact recovery. The caller MUST ensure Obsidian and Syncthing are stopped.
async function restoreBackupOffline(vaultRoot,backupRoot,id) {
  const {vault}=validateDestination(vaultRoot,backupRoot);
  const verification=await verifyBackup(vaultRoot,backupRoot,id);
  const parent=path.dirname(vault);
  const tag=crypto.randomBytes(5).toString('hex');
  const staging=path.join(parent,`.lifora-restore-stage-${tag}`);
  const safety=path.join(parent,`.lifora-before-restore-${tag}`);
  let oldMoved=false,newMoved=false;
  await ensureDir(staging);
  try {
    for(const folder of verification.manifest.directories) await ensureDir(path.join(staging,...folder.split('/')));
    for(const entry of verification.manifest.entries) {
      const dest=path.join(staging,...entry.path.split('/'));
      await ensureDir(path.dirname(dest));
      await fsp.copyFile(path.join(verification.path,'content',...entry.path.split('/')),dest);
      if((await fsp.stat(dest)).size!==entry.size || await digest(dest)!==entry.sha256) throw new Error(`Restored file failed verification: ${entry.path}`);
    }
    const stageInventory=await inspectTree(staging);
    if(stageInventory.files.length!==verification.manifest.fileCount) throw new Error('Staged restore inventory mismatch.');
    if(await fsp.stat(vault).then(x=>x.isDirectory()).catch(()=>false)) {
      await fsp.rename(vault,safety); oldMoved=true;
    }
    await fsp.rename(staging,vault); newMoved=true;
    // The original vault is only deleted AFTER the new copy is verified and published.
    if(oldMoved) await fsp.rm(safety,{recursive:true,force:true});
    return {restored:verification.manifest.fileCount, vault};
  } catch(error) {
    if(oldMoved && !newMoved) await fsp.rename(safety,vault).catch(()=>{});
    throw error;
  } finally {
    if(!newMoved) await fsp.rm(staging,{recursive:true,force:true}).catch(()=>{});
  }
}
module.exports={SCHEMA,validateDestination,listBackups,verifyBackup,createBackup,restoreBackupOffline};
