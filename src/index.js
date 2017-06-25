'use strict';
/**
 * The main file for the skill.
 * 
 * The skill makes use of the Alexa SDK and request module
 * 
 */
//Include the alexa sdk, this is included in node_modules
const Alexa = require('alexa-sdk');
//ADD The App ID
const APP_ID = '';
//Base URL for the know your MSP API
const BaseURL = "https://knowyourmsp.com/api/";

var constituencyMSP = null;

//Method loads and parses the specified json file that is located within lambda
function loadJson(filename){
    var fs = require('fs');
    return JSON.parse(fs.readFileSync('json/' + filename, 'utf8'));
}

//Method checks if specified region is a known region within scotland
function getRegion(region){
    var RegionMap = loadJson('region-map.json');
    //Clean the specified region and put in lower case, easier to handle
    var regionclean = region.toLowerCase().replace(/ /g,'');
    if(!(regionclean in RegionMap)){
        //Region not found return null
        return null;
    } else {
        //Return the region details from region map json file
        return RegionMap[regionclean];
    }
}

//Method checks if specified region is a known region within scotland
function getConstituency(constituency){
    var ConstituencyMap = loadJson('constituency-map.json');
    //Clean the specified constituency and put in lower case, easier to handle
    var constituencyclean = constituency.toLowerCase().replace(/ /g,'');
    if(!(constituencyclean in ConstituencyMap)){
        //Constituency not found return null
        return null;
    } else {
        //Return the constituency details from region map json file
        return ConstituencyMap[constituencyclean];
    }
}

//Method that handles ambiguous constituencies, for exampl Dundee can be Dundee City East or Dundee City West
function getAmbiguousConstituency(constituency){
    var Constituencies = loadJson('ambiguous-constituencies.json');
    //Clean the input and put in lower case, easier to handle
    var constituencyclean = constituency.toLowerCase().replace(/ /g,'');
    if(!(constituencyclean in Constituencies)){
        //No matches found
        return null;
    } else {
        //Return the constituencies the user could mean
        return Constituencies[constituencyclean];
    }
}

//Method that calls the api
function getNetworkResource(callback, path, getVariables) {
    //Include the request module, added in node_modules
    var request = require('request');
    //Make get request (only method currently supported by api)
    request.get(BaseURL + path + '?' + getVariables, function (error, response, body) {
        callback(error, response, body);
    });
}

//Function to generate the output when a constituency is selected
function generateConstituencyOutput(json){
    var output = "";
    var error = true;
    try{
        //Parse the json
        var response = JSON.parse(json);
        if(response.result.toLowerCase === "failure"){
            //Advise of failure if the API didnt find the constituency
            output = "We were unable to find the specified constituency. What is your constituency?";
        } else {
            //Compile the output
            output = "The " + response.constituncy.name + " constituency ";
            //Check if the activeuntil property exists, if so the constituency is defunct
            if(response.constituncy.hasOwnProperty('activeuntil')){
                var date = new Date(response.constituncy.activeuntil);
                output = output + " was replaced on " + date.toDateString() + ".";
                output = output + " Is there anything else I can help with?";
            } else {
                //if not defunct they will have an MSP, output the details
                output = output + "is represented by " + response.constituncy.msp.name + " from " + response.constituncy.msp.party.name + ".";
                output = output + " Would you like to know more about " + response.constituncy.msp.name + "?";
                //add msp name to the constituencyMSP variable, this might be needed for a task.
                constituencyMSP = response.constituncy.msp.name;
            }
            error = false;
        }
    } catch(e){
        //output an error if the try fails, usually caused by json.parse
        output = 'We seem to have run into difficulties. Please try again later.';
    }
    //return the error and output
    return {isError:error, response:output};
}

//Function to generate the output when a region is selected
function generateRegionOutput(json){
    var output = "";
    var error = true;
    try{
        //Parse the json
        var response = JSON.parse(json);
        if(response.result.toLowerCase === "failure"){
            //Output error if the region was not found by the api
            output = "We were unable to find the specified region. What is your region?";
        } else {
            //Compile the output
            output = "The " + response.region.name + " region ";
            //Check if the activeuntil property exists, if so the region is defunct
            if(response.region.hasOwnProperty('activeuntil')){
                var date = new Date(response.region.activeuntil);
                output = output + "was replaced on " + date.toDateString() + ".";
            } else {
                //Compile the list of MSP's that represent a region
                output = output + "is represented by " + response.region.msps.length + " MSP's. These are ";
                for(var i = 0, len = response.region.msps.length; i < len; i++) {
                    //Check if this is the last MSP, if so add and prior to it
                    if(i == len-1){
                        output = output + "and " + response.region.msps[i].name + " from " + response.region.msps[i].party.name + ".";
                    } else {
                        output = output + response.region.msps[i].name + " from " + response.region.msps[i].party.name + ", ";
                    }
                }
            }
            //Add a question at the end of the statement
            output = output + " Would you like to hear a list of constituencies in " + response.region.name + "?";
            error = false;
        }
    } catch(e){
        //Output error if try failed, this might be needed if json parse fails
        output = 'We seem to have run into difficulties. Please try again later.';
    }
    //Return error and output
    return {isError:error, response:output};
}

//Function to obtain the list of constituenies in a region
function generateRegionConstituencyListOutput(json){
    var output = "";
    var error = true;
    try{
        //Parse the json
        var response = JSON.parse(json);
        //Check if the API found results
        if(response.result.toLowerCase === "failure"){
            //Output message if the api didnt find the region
            output = "We were unable to find the specified region. What is your region?";
        } else {
            //Compile the output
            output = "The " + response.region + " region has " + response.constituencies.length + " constituencies.";
            if(response.constituencies.length > 0){
                output = output + " These are ";
                for(var i = 0, len = response.constituencies.length; i < len; i++) {
                    //Check if this is the last returned constituency so that we can add and before it.
                    if(i == len-1){
                        output = output + "and " + response.constituencies[i].name + ".";
                    } else {
                        output = output + response.constituencies[i].name + ", ";
                    }
                }
            }
            //Add a question to the output
            output = output + " Is there anything else I can help with?";
            //Set to false advising no errors
            error = false;
        }
    } catch(e){
        //Output error if try failed, usually caused by json.parse
        output = 'We seem to have run into difficulties. Please try again later.';
    }
    //Return error and output
    return {isError:error, response:output};
}

//Function for outputting the constituency list for a region
function getConstituenciesForRegion(region, that){
    //Check if the passed region is empty
    if(region == '') {
        //output error message advising we need the region
        that.emit(':ask', "The region does not seem to be set, which region would you like information for?", "Which region woul you like information for?");
    } else {
        //Get the region from the json file using the helper method
        var regionDetails = getRegion(region);
        //Check if we have found the region
        if(regionDetails){
            //Make the API csall
            getNetworkResource((error, response, body)=>{
                //Generate the outout
                var output = generateRegionConstituencyListOutput(body);
                if(!error && !output.isError){
                    //Output the consitutency list for the specified region
                    that.emit(':ask', output.response);
                } else if (!output.isError) {
                    //Output message in the event the region hasnt been found
                    that.emit(':tell', output.response);
                } else {
                    //Output error in the event of a http issue
                    that.emit(':tell', "We seem to be experiencing issues right now. Please try again later.");
                }
            }, 'regionconstituencylist.php', 'code=' + regionDetails["regionid"]);
        } else {
            //Output a message advising we did not recognise the region
            that.emit(':ask', "I did not recognise the region, please try again or say list regions.", "Try again or list regions.");
        }
    }
}

function getMSPInformation(that){
    //Function to obtain msp information, ued by yesIntent and MSPInformationByName 
    var mspName = "";
    //check if this is reached due to an open task
    if(that.attributes['task'] == "ConstituencyMSPInformation" && constituencyMSP != null){
        mspName = constituencyMSP;
    } else {
        //No task so get user input
        mspName = that.event.request.intent.slots.msp.value;
    }
    //Make api call
    getNetworkResource((error, response, body)=>{
        //Generate the output
        var output = generateMSPInformationOutput(body);
        //Check if an error occured
        if(!error && !output.isError){
            //Output response if no error found
            that.emit(':ask', output.response);
        } else if (!output.isError) {
            //Output response for api error
            that.emit(':tell', output.response);
        } else {
            //Output response for http error
            that.emit(':tell', "We seem to be experiencing issues right now. Please try again later.");
        }
    }, 'mspdetails.php', 'msp=' + mspName);
}

function generateMSPInformationOutput(json){
    var output = "";
    var error = true;
    try{
        //Try to parse the json
        var response = JSON.parse(json);
        //Check if the API advises of a call error
        if(response.result.toLowerCase === "failure"){
            output = "We were unable to find the MSP you requested.";
        } else {
            //Compile the response based on the json received
            //The scottish government allows for male, female and unspecified, set pronoun to suit
            var pronoun = "They are";
            if(response.msp.name == "Female"){
                pronoun = "She is";
            } else if (response.msp.name == "Male"){
                pronoun = "He is";
            }
            output = response.msp.name + " is a member of " + response.msp.party.name + ".";
            if(response.msp.hasOwnProperty('region')){
                //Check if the MSP represents a region, if they do add details
                output = output + " " + pronoun + " the elected MSP for the region " + response.msp.region.name + ".";
            } else if(response.msp.hasOwnProperty('constituency')){
                //Check if the MSP represents a constituency, if they do add details
                output = output + " " + pronoun + " the elected MSP for the constituency " + response.msp.constituency.name + ".";
            }
            //Add question to see if they would like anything else.
            output = output + " Is there anything else you would like to know?";
            //Set that no error occured
            error = false;
        }
    } catch(e){
        //Output error if try block failed, usually caused by parse if the api isnt available
        output = 'We seem to have run into difficulties. Please try again later.';
    }
    //return response and error
    return {isError:error, response:output};
}

const handlers = {
    'LaunchRequest': function () {
        //Handle session open request
        this.emit(':ask', 'How may I help you?', 'How may I help you?');
    },
    'MSPInformationByName': function(){
        //Intent to get msp info when a user requests by name
        //Pass request to another function
        getMSPInformation(this);
    },
    'SetRegion': function(){
        //Intent to get region information
        //Get region details based on the region name from the user
        var regionDetails = getRegion(this.event.request.intent.slots.region.value);
        if(regionDetails){
            //Make the API call
            getNetworkResource((error, response, body)=>{
                //Compile the response
                var output = generateRegionOutput(body);
                if(!error && !output.isError){
                    //Output the respons from the API
                    this.attributes['task'] = "ShouldListConstituenciesForRegion"
                    this.attributes['region'] = this.event.request.intent.slots.region.value;
                    this.emit(':ask', output.response);
                } else if (!output.isError) {
                    //Output the error given by the api
                    this.emit(':tell', output.response);
                } else {
                    //Output when http error occurs
                    this.emit(':tell', "We seem to be experiencing issues right now. Please try again later.");
                }
            }, 'regiondetails.php', 'code=' + regionDetails["regionid"]);
        } else {
            //Advise we did not recognise the region
            this.emit(':ask', "I did not recognise the region, please try again or say list regions.", "Try again or list regions.");
        }
    },
    'ListRegions': function(){
        //Intent to handle user requesting a list of regions
        //Get the list of regions from the json file
        var Regions = loadJson('regions.json');
        var regionCount = Regions.length;
        var lastElement = Regions.pop();
        var regionsJoined = Regions.join(", ");
        regionsJoined = regionsJoined + " and " + lastElement;
        //Output a list of region
        this.emit(':ask', "There are " + regionCount + " regions in Scotland, these are " + regionsJoined + ". Which would you like?", "Which would you like?");
    },
    'SetConstituency': function(){
        //Intent to obtain the constituency details
        var constituencyDetails = getConstituency(this.event.request.intent.slots.constituency.value);
        //Check the constituency is real
        if(constituencyDetails){
            //Make the api call
            getNetworkResource((error, response, body)=>{
                if(!error){
                    //Generate output for constituency request, may output error
                    var output = generateConstituencyOutput(body)
                    //Handle api advising of failure
                    if(output.isError){
                        //Handle error in calling the API
                        this.emit(':tell', output.response);
                    } else {
                        //Setup the task using attributes and setup data that it may need
                        this.attributes['task'] = "ConstituencyMSPInformation";
                        this.attributes['constituency'] = this.event.request.intent.slots.constituency.value;
                        this.attributes['msp'] = constituencyMSP;
                        //outpit the response
                        this.emit(':ask', output.response);
                    }
                } else {
                    //Handle http error
                    this.emit(':tell', "We seem to be experiencing issues right now. Please try again later.");
                }
            }, 'contituencydetails.php', 'code=' + constituencyDetails["constituencyid"]);
        } else {
            var ambiguousConstituencies = getAmbiguousConstituency(this.event.request.intent.slots.constituency.value);
            //Check if the constituency is ambiguous
            if(ambiguousConstituencies) {
                var constituencyCount = ambiguousConstituencies["constituencymatches"].length;
                var lastElement = ambiguousConstituencies["constituencymatches"].pop();
                var constituenciesJoined = ambiguousConstituencies["constituencymatches"].join(", ");
                constituenciesJoined = constituenciesJoined + " and " + lastElement;
                //Output a list of constituencies that might match prompting for which 1. In future change to numerical?
                this.emit(':ask', "There are " + constituencyCount + " potential matches for " + ambiguousConstituencies["constituencyname"] + ". These are " + constituenciesJoined + ". Which would you like?", "Which would you like?");
            } else {
                //Advise nothing found that matches the constituency
                this.emit(':ask', "I did not recognise the constituency, please try again.", "Try again.");
            }
        }
    },
    'About': function(){
        //Output details about the intent and creator
        this.emit(':tell', "Know your MSP is a companion skill to the site know your msp dot com. We utilise the API located on data dot parliament dot scot. Our aim is to make it easy to get relevant information about the Scottish Parliament and your constituency. For more information, visit know your msp dot com.");
    },
    'AMAZON.HelpIntent': function () {
        //Built in intent to tell user how to use the skill
        this.emit(':ask', 'I can give you information about your constituency, for example you can say ask me tell me about the Dundee East constituency or ask me about a specific MSP by saying tell me about Shona Robison. What would you like to know?', 'How would you like me to help you?');
    },
    'AMAZON.CancelIntent': function () {
        //Simple goodbye if the user ends the intent
        this.emit(':tell', 'Goodbye!');
    },
    'AMAZON.StopIntent': function () {
        //Simple goodbye if the user ends the intent
        this.emit(':tell', 'Goodbye!');
    },
    'AMAZON.NoIntent': function () {
        //Handle no intent, intended for if a task has been set
        if(this.attributes['task'] == ''){
            this.emit(':ask', "I did not understand the request, how can I help you?", "How can I help you?");
        } else {
            var currentTask = this.attributes['task'];
            switch(currentTask) {
                case 'ShouldListConstituenciesForRegion':
                    //Handle user not wishing to hear constituency list
                    this.attributes['task'] = 'AnythingFurther';
                    this.emit(':ask', "No problem, is there anything else I can do for you?", "Is there anything else I can do for you?");
                    break;
                case 'ConstituencyMSPInformation':
                    //After giving constituency details, handles no if user wishes to know more about the msp.
                    constituencyMSP = this.attributes['msp'];
                    getMSPInformation(this);
                    break;
                case 'AnythingFurther':
                    //Simple task, ask the user if there is anything further
                    this.emit(':tell', "Thank you, come back soon.");
                    break;
                default:
                    //Should never be called but handle if invalid task set
                    this.emit(':ask', "I did not understand the request, how can I help you?", "How can I help you?");
                    break;
            }
        }
    },
    'AMAZON.YesIntent': function () {
        //Handle yes intent, intended for if a task has been set
        if(this.attributes['task'] == ''){
            //Handle case where task is not set
            this.emit(':ask', "I did not understand the request, how can I help you?", "How can I help you?");
        } else {
            var currentTask = this.attributes['task'];
            switch(currentTask) {
                case 'ShouldListConstituenciesForRegion':
                    //After hearing region info handles user wishing to hear the regions constituency list
                    getConstituenciesForRegion(this.attributes['region'], this);
                    break;
                case 'ConstituencyMSPInformation':
                    //After giving constituency details, handles yes if user wishes to know more about the msp, saves the user specifying again.
                    constituencyMSP = this.attributes['msp'];
                    getMSPInformation(this);
                    break;
                case 'AnythingFurther':
                    //Simple task, ask the user if there is anything further
                    this.emit(':ask', "Great, how else can I help?", "How else can I help?");
                    break;
                default:
                    //Should never be called but handle if invalid task set
                    this.emit(':ask', "I did not understand the request, how can I help you?", "How can I help you?");
                    break;
            }
        }
    },
    'SessionEndedRequest': function () {
        //Handles session end request, should not output anything, used to cleanup but nothing to clean in this skill
    },
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    //Corrected, examples in Lambda have this incorrectly set.
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};