/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Vibe = require('ui/vibe');
var _ = require('underscore');

var storageKeys = [
  'p.singles',
  'p.doubles',
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
  't.traditional',
  't.ninegr',
  't.sevengr',
  't.fivegr',
  'm.single',
  'm.twoofthree'
];

var storageKeysStatus = {};


var groups = {
  p:"Participants",
  g:"Game Format",
  t:"Tournament Format",
  m:"Match Format"
};

var groupCounts =  {
    p:{s:0,u:0},
    g:{s:0,u:0},
    t:{s:0,u:0},
    m:{s:0,u:0}
  };

var downClicks = 0;

/**
 * Menu Options
 */

var participantsMenuOptions = [
  {
    title: "Singles",
    storageKey: "p.singles"
  },
  {
    title: "Doubles",
    storageKey: "p.doubles"
  }
];

var gameFormatMenuOptions = [
  {
    title: "Traditional",
    icon: "images/crib_small.png",
    storageKey: "g.traditional"
  },
  {
    title: "Variations",
    icon: "images/crib_var.png",
    storageKey: "g.variations"
  },
  {
    title: "Crash",
    icon: "images/crashSmall.png",
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
  }
];

var tournamentFormatMenuOptions = [
  {
    title: "Traditional",
    storageKey: "t.traditional"
  },
  {
    title: "9 Game GR",
    storageKey: "t.ninegr"
  },
  {
    title: "7 Game GR",
    storageKey: "t.sevengr"
  },
  {
    title: "5 Game GR",
    storageKey: "t.fivegr"
  }
];

var matchFormatMenuOptions = [
  {
    title: "Single Game",
    storageKey: "m.single"
  },
  {
    title: "Best 2 of 3",
    storageKey: "m.twoofthree"
  }
];

var mainMenuOptions = [
  {
    title: groups.p,
    groupKey: 'p',
    subMenuOptions: participantsMenuOptions
  },
  {
    title: groups.g,
    groupKey: 'g',
    subMenuOptions: gameFormatMenuOptions
  },
  {
    title: groups.t,
    groupKey: 't',
    subMenuOptions: tournamentFormatMenuOptions
  },
  {
    title: groups.m,
    groupKey: 'm',
    subMenuOptions: matchFormatMenuOptions
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
      items: mainMenuOptions
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
  mainMenu.show();
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

//when we select an item on the main menu, show the option menu
mainMenu.on('select',showOptionsMenu);
//if we long select an item, we are going to subscribe/unsubscribe to all topics under the group
mainMenu.on('longSelect',toggleAll);

//show the main window
main.show();

//if the number of topics subscribed is <= unsubscribed, then it will subscribe to all unsubscribed
//otherwise it will unsubscribe to all subscribed
function toggleAll(event){
  Vibe.vibrate('short');
  var menu = event.menu;
  var item = menu.item(event.sectionIndex,event.itemIndex);
  var s = groupCounts[item.groupKey].s;
  var u = groupCounts[item.groupKey].u;
  var f;
  if(s <= u){
      f = function(k){
      if(!getSubscribedBoolean(k)){
        Pebble.timelineSubscribe(k,function(){},function(){});
         updateStorage(k,'s');
      }
    };
  } else {
    f = function(k){
      if(getSubscribedBoolean(k)){
        Pebble.timelineUnsubscribe(k,function(){},function(){});
         updateStorage(k,'u');
      }
    };
  }
  //originally I was calling the subscribe/unscribe inside the loop
  //and then the updateStorage/updateMainMEnuCounts inside the callback
  //but that was giving me issues, so, I'm just doing it this way.
  for(var i=0;i<item.subMenuOptions.length;i++){
    var key = item.subMenuOptions[i].storageKey;
    f(key);  
  }
  updateMainMenuCounts();
}

//this will go through and update the subtitle (subscribed or not subscribed)
//for each option in the topic menu
//then it will create the menu
function showOptionsMenu(event){
  var options = mainMenuOptions[event.itemIndex].subMenuOptions;
  for(var i =0;i<options.length;i++){
    var subtitle = getSubscribedString(options[i].storageKey);
    options[i].subtitle = subtitle;
  }
  var optionsMenu = new UI.Menu({
     sections:[
        {
          title: "Options",
          items: mainMenuOptions[event.itemIndex].subMenuOptions
        }
      ]
    });
    optionsMenu.on("select",toggleSubscription);
    optionsMenu.show();
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
          updateMainMenuCounts();
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
           updateMainMenuCounts();
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
        initCounts();
      },
      function (errorString) {
        console.log('Error getting subscriptions: ' + errorString);
      }
    );
}

/*
function checkSubscriptions(){
  Pebble.timelineSubscriptions(
  function (topics) {
    console.log('All Subscriptions: ' + topics.join(', '));
  },
  function (errorString) {
    console.log('Error getting subscriptions: ' + errorString);
  }
);
}
*/

//changes the status in the storage object
//and also updates the counts for the groups
function updateStorage(key,status){
  storageKeysStatus[key] = status;
  var p = key.split(".");
  var o = status == "s" ? "u" : "s";
  groupCounts[p[0]][status]++;
  groupCounts[p[0]][o]--;
}

//unsubscribes (API and storage) from all topics
function resetAll(){
  var f= function(){};
  for(var i = 0;i<storageKeys.length;i++){
    Pebble.timelineUnsubscribe(storageKeys[i],f,f);
    updateStorage(storageKeys[i],'u');
  }
  initCounts();
 
}

//updates the main menu subtitles to show the proper
//s and u counts.
function updateMainMenuCounts(){
   for(var i=0;i<mainMenuOptions.length;i++){
     mainMenuOptions[i].subtitle = "S: "+groupCounts[mainMenuOptions[i].groupKey].s+"/U: "+groupCounts[mainMenuOptions[i].groupKey].u;     
   }
    mainMenu.items(0,mainMenuOptions);
   
}

//reset the group counts
//sets everythign to 0, then increments as needed.
function initCounts(){
  groupCounts = {
    p:{s:0,u:0},
    g:{s:0,u:0},
    t:{s:0,u:0},
    m:{s:0,u:0}
  };
  _.each(storageKeysStatus,function(value,key){
    var p = key.split(".");
    groupCounts[p[0]][value]++;
  });
  updateMainMenuCounts();
}