<%*
try {
  tR = "";
  const daily = window?.timeGarden?.daily;
  console.log(daily);
  if (!daily) throw new Error("LIFORA not initialized");
  await daily.generateRatingAndAlias(tp, app);
} catch (error) {
  console.error("Error in Daily AI Rate:", error);
  new Notice(`❌ Error: ${error.message}`);
} 
-%>