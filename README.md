# Know Your MSP Alexa Skill

This repository contains the code that powers the Know Your MSP Amazon Alexa skill.

More information can be found at https://www.hackster.io/peter-mcdonald/know-your-msp-285db6

# Contents

## speechAssets

This folder contains the Intent Schema for the skill

## src

This folder contains all of the source code for the skill. When implementing the skill the contents of this folder should be zipped and uploaded to the AWS console.

### src/json

This folder contains the JSON files the skill uses to ascertain if a region or constituency is real. This saves on requests to the HTTPS server therefore reducing time taken to process requests. The json files contain entries that allow matching and identification of regions and constituencies when only partial names are provided (dundee east matches dundee city east for example).

## test

This folder contains the test scripts. These can be used when testing the skill in Visual Studio Code, it enables testing of the skill without the need to upload the skill files to the AWS console.

Full instructions coming soon.
