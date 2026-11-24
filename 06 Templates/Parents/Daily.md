<%"---"%>
<%*
tR += await tp.file.include("[[Daily Banner Config]]"); 
%>

<%* tR+= "cssclasses:"%>
  - <%"image-borders"%>
  - image-small
  - <%"timegarden-daily"%>
  <%* 
    tR += "- " + moment(tp.file.title, 'YYYY-MM-DD').format('dddd').toLowerCase()
    tR += "\n  - daily"
    %> 

date: <% moment(tp.file.title, 'YYYY-MM-DD-dddd').format("YYYY-MM-DD") %>

alias: 
dayRating: 1
tags: "#type/daily-note"

journal: daily
journal-date: <% moment(tp.file.title, 'YYYY-MM-DD-dddd').format('YYYY-MM-DD') %>
journal-start-date: <% moment(tp.file.title, 'YYYY-MM-DD-dddd').format('YYYY-MM-DD') %>
journal-end-date: <% moment(tp.file.title, 'YYYY-MM-DD-dddd').format('YYYY-MM-DD') %>

aiAnswer: ""
<%"---"%>
# <span class="tg-inline-svg-icon tg-icon-sparkles" aria-hidden="true"></span> <% moment(tp.file.title, 'YYYY-MM-DD-dddd').format("dddd, MMMM DD, YYYY") %>
[[<% // create hidden link to weekly note for graph view

moment(tp.file.title, 'YYYY-MM-DD-dddd').format('YYYY-[W]WW') %>|]]

<%*
// create input field for alias
tR += await tp.file.include("[[Daily MetaBindAlias]]");
%>
---
- <%* tp.file.cursor(0); %>


<%*
tR += await tp.file.include("[[Daily MetaBindAiButtons]]");
%>
---
### <span class="tg-inline-svg-icon tg-icon-folder" aria-hidden="true"></span> Pictures


### <p hidden>PicturesEnd</p>
---
<%*
tR += await tp.file.include("[[Daily MetaBindRating]]");
%>

### <span class="tg-inline-svg-icon tg-icon-zap" aria-hidden="true"></span> Quick Notes
---
<p hidden>placer</p>

### <span class="tg-inline-svg-icon tg-icon-target" aria-hidden="true"></span> Today's Focus

Choose up to three outcomes that would make today meaningful.

- [ ] **Priority 1:** 
- [ ] **Priority 2:** 
- [ ] **Priority 3:** 

### <span class="tg-inline-svg-icon tg-icon-calendar" aria-hidden="true"></span> Daily Schedule

| Time | Plan / Appointment | Done |
|:--|:--|:--:|
| Morning |  | ☐ |
| Afternoon |  | ☐ |
| Evening |  | ☐ |

### <span class="tg-inline-svg-icon tg-icon-leaf" aria-hidden="true"></span> Daily Reflection

**What went well today?**


**What was difficult or distracting?**


**What did I learn or notice?**


**What should I carry into tomorrow?**


<%*
tR += await tp.file.include("[[Daily MetaBindPinButtons]]");
%>
---
<%*
tR += await tp.file.include("[[Daily YearNoteThrowback]]");
%>

### Q&A
---
<%*
tR += await tp.file.include("[[Daily MetaBindAiQA]]");
%>
