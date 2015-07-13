/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Vibe = require('ui/vibe');
var _ = require('underscore');

var storageKeys = [

  'g.traditional',
  'g.variations',
  'g.crash',
  'g.kings',
  'g.cross',
  'g.baseball',
  'g.jokers',
  'g.lowball',
  'g.backup',
  'g.toss',
  'g.manualcount',
  'g.muggins'
  
  
];

var storageKeysStatus = {};

var downClicks = 0;

/**
 * Menu Options
 */

var gameFormatMenuOptions = [
  {
    title: "Traditional",
    icon: "IMAGES_TRAD",
    storageKey: "g.traditional"
  },
  {
    title: "Variations",
    icon: "IMAGES_VAR",
    storageKey: "g.variations"
  },
  {
    title: "Crash",
    icon: "IMAGES_CRASH",
    storageKey: "g.crash"
  },
  {
    title: "Kings",
    icon: "images/kc_small.png",
    storageKey: "g.kings"
  },
  {
    title: "Cross",
    icon: "images/crossicon.png",
    storageKey: "g.cross"
  },
  {
    title: "Baseball",
    icon: "images/rtbIcon.png",
    storageKey: "g.baseball"
  },
  {
    title: "Back up 10",
    icon: "images/backTenIcon.png",
    storageKey: "g.backup"
  },
  {
    title: "Toss 5s",
    icon: "images/tossFives.png",
    storageKey: "g.toss"
  },
  {
    title: "4 Jokers",
    icon: "images/fourJokersIcon.png",
    storageKey: "g.jokers"
  },
  {
    title: "Lowball",
    icon: "images/loserTransparent.png",
    storageKey: "g.lowball"
  },
  {
    title: "Manual Count",
    icon: "images/mugginsIcon.png",
    storageKey: "g.manualcount"
  },
  {
    title: "Muggins",
    icon: "images/muggerIcon.png",
    storageKey: "g.muggins"
  }
];



/**
 * Layers, windows, menus, etc
 */

//This is what we see when the app is opened
var main = new UI.Card({
  title: 'eCribbage',
  icon: 'images/crib_small.png',
  subtitle:'Tournaments',
  body: 'Press the middle button to configure subscriptions.'
});

//This is what you see after hitting the select button
var mainMenu = new UI.Menu({
  sections:[
    {
      title: "Subscriptions",
      items: gameFormatMenuOptions
    }
  ]
});


/**
 * Events
 */

//initialize the storage, which queries the
//timeline api for subscriptions, 
//resets our downClick count to 0,
//and then shows the main menu
main.on('click', 'select', function(e) {
  initStorage();
  downClicks = 0;
  showOptionsMenu();
});

//if we click down on the main screen, increment our down click count
main.on('click','down',function(e){
  downClicks++;
});

//if we click up on the main screen, reset our down click count
main.on('click','up',function(e){
  downClicks=0;
});

//if we long click the select option, AFTER clicking down exactly 3 times
//then reset everything - this includes unsubscribing from all topics
main.on('longClick','select',function(e){
  if(downClicks == 3){
    Vibe.vibrate('double');
    resetAll();
  }
  downClicks=0;
});

//show the main window
main.show();


//this will go through and update the subtitle (subscribed or not subscribed)
//for each option in the topic menu
//then it will create the menu
function showOptionsMenu(){
  var options = gameFormatMenuOptions;
  for(var i =0;i<options.length;i++){
    var subtitle = getSubscribedString(options[i].storageKey);
    options[i].subtitle = subtitle;
  }
  mainMenu.items(0,options);
  mainMenu.on("select",toggleSubscription);
  mainMenu.show();
}

//toggles the topic between subscribed and unsubscribed
function toggleSubscription(event){
  if(isSubscribed(event)){
    unsubscribe(event);    
  } else {
   subscribe(event);
  }
}

//determined if the event
//represents a menu item of a subscribed topic
function isSubscribed(event){
  var menu = event.menu;
  var item = menu.item(event.sectionIndex,event.itemIndex);
  return getSubscribedBoolean(item.storageKey);
}

//unsubscribes from the topic
//makes the API call, and if successful,
//will update the storage and the menu items subtitle
function unsubscribe(event){
  var menu = event.menu;
  var item = menu.item(event.sectionIndex,event.itemIndex);
  Pebble.timelineUnsubscribe(item.storageKey,
        function(){
          updateStorage(item.storageKey,'u');
          item.subtitle = "Not Subscribed";
          menu.item(event.sectionIndex,event.itemIndex,item); 
        },
        function(error){
          console.log("Unable to unsubscribe from "+item.storageKey+": "+error);
        });
}

//does the opposite of unsubscribe
function subscribe(event){
  
  var menu = event.menu;
  var item = menu.item(event.sectionIndex,event.itemIndex);
    Pebble.timelineSubscribe(item.storageKey,
         function(){
          updateStorage(item.storageKey,'s');
          item.subtitle = "Subscribed";
          menu.item(event.sectionIndex,event.itemIndex,item);
        },
        function(error){
          console.log("Unable to subscribe to "+item.storageKey+": "+error);
        }
    );
}


//returns the string to display in the subtitle for a topic
function getSubscribedString(key){
  return getSubscribedBoolean(key) === true ? "Subscribed" : "Not Subscribed";
}

//resolves whether a key is subscribed or not
function getSubscribedBoolean(key){
  return storageKeysStatus[key] === "s" ? true : false;
}

//initializes storage
//by pulling all subscribed topics
//and then populating the storage item
//with s or u
function initStorage(){
    Pebble.timelineSubscriptions(
      function (topics) {
        for(var i = 0;i<storageKeys.length;i++){
          var v = topics.indexOf(storageKeys[i]) >= 0 ? "s" : "u";
          updateStorage(storageKeys[i],v);
        }
      },
      function (errorString) {
        console.log('Error getting subscriptions: ' + errorString);
      }
    );
}


//changes the status in the storage object
//and also updates the counts for the groups
function updateStorage(key,status){
  storageKeysStatus[key] = status;
}

//unsubscribes (API and storage) from all topics
function resetAll(){
  var f= function(){};
  for(var i = 0;i<storageKeys.length;i++){
    Pebble.timelineUnsubscribe(storageKeys[i],f,f);
    updateStorage(storageKeys[i],'u');
  }
 }

