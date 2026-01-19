# Issue #339: Attachments inlining into log

**State:** OPEN

**URL:** https://github.com/ts-factory/bublik-ui/issues/339

## Description

## Problem statement

- We have main test log that is nicely displayed in the log view - call it `main log`.
- We also have attachments and there are projects where attachment is a text file with timestamps
- We want to have a way to merge main log with the attachment log (or multiple later, but let's start with one) and show them as it was always part of the main log :-)

## Suggested solution

- mid term: we upload not just the text log, but a json version of the log
    - we can worry about runtime conversion later if needed
- json log will have the same format as TE log, so

```json
  "version": "v1",
  "root": [
    {
      "type": "te-log",
      "content": [
        // as you can see a number of fields was removed - we can have a different type (say te-log-artefact) if it simplifies the handling
        {
          // as you can see a number of fields was removed - we can have a different type (say te-log-artefact-meta) if it simplifies the handling
          "type": "te-log-meta",
          "meta": {
            "artifacts": [
              {
                "level": "RING",
                "artifact": "Any artefacts if we want to have them"
              },
            ],
          }
        },
        {
          "type": "te-log-table",
          "data": [
            {
              "line_number": 1,
              "level": "ERROR",
              "entity_name": "<ENTITY>",
              "user_name": "<USER>",
              "timestamp": {
                "timestamp": 1744081008.02338,
                "formatted": "02:56:48.023"
              },
              "log_content": [
                {
                  "type": "te-log-table-content-text",
                  "content": "line number one of the content"
                }
              ]
            },
            {
              "line_number": 2,
              "level": "RING",
              "entity_name": "<ENTITY>",
              "user_name": "<USER>",
              "timestamp": {
                "timestamp": 1744081008.05433,
                "formatted": "02:56:48.054"
              },
              "log_content": [
                {
                  "type": "te-log-table-content-text",
                  "content": "line number two of the content"
                }
              ],
                .....
```


 - merge algorithm should be:
     - artifacts: we just merge the lists
     - te-log-table:
         - for every level 0 log in the attachment log table
             - based on the timestamp find the Step in the log to which the message would've belonged,
             - insert the message there at level-1 (i.e. create `children` node of the step if does not exit) and put on level-1
             - attachment log MUST NOT have children (for now)
         - the problematic part of the merge: line numbers
             - main log line numbers MUST NOT change
             - 3 options:
                 - attachment log line numbers are ignored and we don't have any line numbers
                 - resulting line numbers are actually `"main log step line number"."attachment log line number"`, but this approach has 2 problems:
                     - if we have >1 attachment log merged in this way it will have a clash
                     - json log has "line number" as an integer, not string
                 - show attachment line number in the view (ie. it will be a bit confusing, but still) and have HTML anchor as "attachment_name.line_number" so that you can link to it.

## Comments (3)

### okt-limonikas

## Scenarios

### Scenario A: Nested Children Approach
Main log entries are matched with attachment log entries based on timestamps, and attachment entries become children of the closest main log entry.

**Before Merge**:
```
Main Log:
Record 1 (Step) - Timestamp: 10:00:00
  Record 2      - Timestamp: 10:00:10
  Record 3      - Timestamp: 10:00:20
  Record 4      - Timestamp: 10:00:30
Record 5 (Step) - Timestamp: 10:01:00
  Record 6      - Timestamp: 10:01:10
  Record 7      - Timestamp: 10:01:20
  Record 8      - Timestamp: 10:01:30

Attachment Log:
Record A        - Timestamp: 10:00:15
Record B        - Timestamp: 10:00:25
Record C        - Timestamp: 10:01:15
```

**After Merge (Scenario A)**:
```
Main Log:
Record 1 (Step) - Timestamp: 10:00:00
  Record 2      - Timestamp: 10:00:10
    Record A    - Timestamp: 10:00:15 (from attachment)
  Record 3      - Timestamp: 10:00:20
    Record B    - Timestamp: 10:00:25 (from attachment)
  Record 4      - Timestamp: 10:00:30
Record 5 (Step) - Timestamp: 10:01:00
  Record 6      - Timestamp: 10:01:10
    Record C    - Timestamp: 10:01:15 (from attachment)
  Record 7      - Timestamp: 10:01:20
  Record 8      - Timestamp: 10:01:30
```

### Scenario B: Step-Level Attachment
Attachment log entries are grouped under their corresponding "step" but not necessarily matched to specific child records.

**After Merge (Scenario B)**:
```
Main Log:
Record 1 (Step) - Timestamp: 10:00:00
  CreateNode    - Timestamp: 10:00:04 (from attachment)
    Record A      - Timestamp: 10:00:07 (from attachment)
    Record B      - Timestamp: 10:00:08 (from attachment)
  Record 2      - Timestamp: 10:00:10
  Record 3      - Timestamp: 10:00:20
  Record 4      - Timestamp: 10:00:30
Record 5 (Step) - Timestamp: 10:01:00
  CreateNode    - Timestamp: 10:01:15 (from attachment)
    Record C    - Timestamp: 10:01:15 (from attachment)
  Record 6      - Timestamp: 10:01:10
  Record 7      - Timestamp: 10:01:20
  CreateNode    - Timestamp: 10:01:21 (from attachment)
    Record D    - Timestamp: 10:01:24 (from attachment)
    Record E    - Timestamp: 10:01:27 (from attachment)
  Record 8      - Timestamp: 10:01:30
```

## To consider

### Tagged

Add tags and just merge based on step etc...:

```
Merged Log (Tagged):
- [MAIN] Record 1 (Step)    - Timestamp: 10:00:00
- [MAIN] Record 2           - Timestamp: 10:00:10
- [ATTACH] Record A         - Timestamp: 10:00:15
- [MAIN] Record 3           - Timestamp: 10:00:20
- [ATTACH] Record B         - Timestamp: 10:00:25
- [MAIN] Record 4           - Timestamp: 10:00:30
- [MAIN] Record 5 (Step)    - Timestamp: 10:01:00
- [MAIN] Record 6           - Timestamp: 10:01:10
- [ATTACH] Record C         - Timestamp: 10:01:15
- [MAIN] Record 7           - Timestamp: 10:01:20
- [MAIN] Record 8           - Timestamp: 10:01:30
```

### Like Diff View

```
Like git diff view just show two logs side by side
Main Log                     | Attachment Log
---------------------------- | ---------------------------
Record 1 (10:00:00) ---+     |
Record 2 (10:00:10) ----+    |
                        +--> | Record A (10:00:15)
Record 3 (10:00:20) ----+    |
                        +--> | Record B (10:00:25)
Record 4 (10:00:30) ---+     |
Record 5 (10:01:00) ---+     |
Record 6 (10:01:10) ----+    |
                        +--> | Record C (10:01:15)
Record 7 (10:01:20) ---+     |
Record 8 (10:01:30) ---+     |
```

### Add attachment nodes to expand based on timestamps

```
Main Log:
- Record 1 (Step) - Timestamp: 10:00:00
- Record 2       - Timestamp: 10:00:10
  [+] Attachment entries (1) - Click to expand
- Record 3       - Timestamp: 10:00:20
  [+] Attachment entries (1) - Click to expand
- Record 4       - Timestamp: 10:00:30
- Record 5 (Step) - Timestamp: 10:01:00
- Record 6       - Timestamp: 10:01:10
  [+] Attachment entries (1) - Click to expand
- Record 7       - Timestamp: 10:01:20
- Record 8       - Timestamp: 10:01:30
```
## Questions

#### Question 1: Level Interpretation
> "for every level 0 log in the attachment log table insert the message there at level-1 (i.e. create `children` node of the step if does not exit) and put on level-1"

**Clarification needed**: 
- The original description seems to use "level-1" to mean "one level deeper than the parent" (which would be level+1 in depth terms)
- Do you maybe mean not level-1 but level + 1 since depth is increasing?

### Question 2: Matching Strategy
> "based on the timestamp find the Step in the log to which the message would've belonged"

**To consider**:
1. **Chronological insertion**: Insert attachment log entries between main log entries based purely on timestamps
2. **Parent-child relationship**: Find the "closest" main log entry (by timestamp) and make the attachment entry a child of it

### Question 3: Step Definition
What do you mean saying **step** since in the log we have `User Name` step which produces nested records

**Clarification needed**:
- In the log structure, what exactly defines a "Step"?

### Question 4: Level 0
> "for every level 0 log in the attachment log table"

**Questions**:
- Why process only level 0 entries from the attachment log?
- Should we process all entries from the attachment log regardless of level?
- If the attachment log already has hierarchy, how should that be preserved?

Above you see like we attach entries to main log step (based on user name step) or attach individual records to closest records in main log based on timestamp

## Request

- Can you provide example matching like I did above so I can better understand matching strategy?
- Can you provide example data of main and attachment logs (text will work) for me to review?

### okt-kostik

1. I think the only option that is remotely related to what I suggested is option#B

2. I'm not convinced that we should from day1 create nodes on L1 and push all attachment logs to L2, unless (unless) you find a way to display them differently in the HTML view, i.e. to have easier way to look at things if you have 1 log per "group" of attachment logs - otherwise you'll have 2 lines in the log table for every 1 log line from attachment

3. Diff view is an option, but let's not make it the first one to be implemented. Overall I like your idea.

## Questions

Your questions.

Question 1:

 - Level 0 is **level 0** - the level on which Steps exist
 - I was suggesting to push attachment logs to **level 1**

Question 2:

 - I don't understand what your'e saying - I outlined an algorithm...  the "place" where the attachment log is inserted is found by timestamp
 - you seem to keep asking the level/depth where it's inserted

As discussed:

 - either you have everything on level1 under the matching (based on timestamp) level 0 step
 - or we create a way to "group" the logs, my only worry is that if we have a line that is "this is group of attachment logs" and 1 attachment line log under it this might look bulk

Question 3:

 - Step is User Name Step - this is what a Step of test

Question 4: 

> Why process only level 0 entries from the attachment log?

Let's say we have:

- main log with 2 timestamps: 1 second and 3 second
- attach log with: level 0 log with timestamp 1 second and under it level 1 log with 10 sec timestamp

How are you going to merge those if you allow this?

We only **allow** level 0 logs there.

> Should we process all entries from the attachment log regardless of level?

See above

> If the attachment log already has hierarchy, how should that be preserved?

it's not clear if it can be, that's the problem. Cause the MAIN requirement is to keep the chronological order of the logs and merging two trees is way harder + will look like shit

### okt-kostik

> Can you provide example data of main and attachment logs (text will work) for me to review?

- take any main log - it's a TE log from any test, right?

Attachment log:

```
   26 # - 04:27:39.509470 DEBUG1: hello word
   25 # - 04:27:40.509491 DEBUG1: another message
   24 # - 04:27:40.509496 DEBUG1: and another message
   26 # - 04:27:42.509496 DEBUG1: final message
```

with timestamp that are around the times of main log

