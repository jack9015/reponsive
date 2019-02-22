require('./vendors.js');
const MicRecorder = require('mic-recorder-to-mp3');
const parseUrl = require("parse-url");
const toastr = require('toastr');
const bcrypt = require('bcryptjs');
const noSleepLib = require('nosleep.js');
var validator = require('validator');
const noSleep = new noSleepLib();


var voicelayer = new VoiceLayer("241568b0d7864677bca3eebdf57b6dc2", "49d120f4be945aac05f421476561c6c3", {
  directory: "voicelayersdk",
  pingFrequency: 120000,
  pongTimeout: 6000,
  unavailableTimeout: 10000
});

var vChannelId = 0;
var vLastMsgId = 0;
var vTokenId = 0;

// const Recorder = require('./recorder.js');
// console.log(Recorder);
var _ = require('underscore');
var imgLoaded = require('imagesloaded');
import $ from 'jquery';
window.jQuery = $;
window.$ = $;

window.URL = window.URL || window.webkitURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext;
navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;




(function () {
    "use strict";

    function TalkeeIM(firebaseRef, options) {
        this.DbRef = firebaseRef;
        this._options = options || {};
        this._currentUser = null;
        this.emailsignupname = null;
        this._currentUserId = null;
        this._currentPortal = null;
        this._currentChannel = null;
        this._exploreChannelList = new Array();
        this._channelUsersList = new Array();
        this.deleteChannelTrackers = [];
        this._activeChatRoomId = '';
        this._activeChatRoomReceiver = '';
        this._voiceRecorder = null;
        this._audioStream = null;
        this._voiceTracks = null;
        this._lastTimer = null;
        this.recordIterator = 1;
        this.recordTimout = 22;
        this.isMobile = false;
        this.audioQueue = [];
        this.audioQueuePlaying = false;
        this.roomSubscribes = [];
        this.channelSubscribes = []; //checking channel member update
        this._loadingImageUrl = 'images/icon/loading.gif';
        this.defaultAvatar = 'images/icon/avatar1.jpg';
        this._validImageTypes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/gif',
        ],
        this._validFileTypes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/gif',
          'video/mpeg',
          'video/ogg',
          'video/x-msvideo',
          'video/3gpp',
          'video/3gpp2',
          'video/webm',
          'audio/aac',
          'audio/ogg',
          'audio/wav',
          'audio/webm',
          'audio/mp3',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/x-rar-compressed',
          'application/x-7z-compressed',
          'application/zip',
          'application/x-zip-compressed',
          'text/plain',
        ]
        this.attachEventHandlers();
        this.initFirebaseAuth();
    }

    TalkeeIM.prototype.signIn = function() {
        // Sign in Firebase using popup auth and Google as the identity provider.
        var provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider);
    }

    TalkeeIM.prototype.signOut = function() {
        voicelayer.auth.logout(function(err, data) {
          console.log("Logged out");
        });

        // Sign out of Firebase.    
        firebase.auth().signOut();
        var crntParsedUrl = parseUrl(window.location.href);
        if(crntParsedUrl.resource == "localhost")
        var baseUrl = 'http://localhost/talkee/dist';
        else
        var baseUrl = 'https://www.talkee.co.uk/app';
        // history.pushState(null, null, baseUrl+'/'+data.url);
        window.location.replace(baseUrl);
    }

    TalkeeIM.prototype.checkSignedInWithMessage = function() {
      /* var self = this;
      // Return true if the user is signed in Firebase
      if (self.isUserSignedIn()) {
        return true;
      }    
      // Display a message to the user using a Toast.
      var data = {
        message: 'You must sign-in first',
        timeout: 2000
      };
      alert(data);
      return false; */
    }

    TalkeeIM.prototype.setCurrentUser = function(userData) {
      var self = this;
      self._currentUser = userData;        
      console.log(self._currentUser);
    }

    TalkeeIM.prototype.getUser = function(cb){
      var self = this;
      firebase.database().ref('/users/' + firebase.auth().currentUser.uid).once('value', function(snapshot) {
        //cb(snapshot.val());
        if(snapshot.val() != null){
          cb(snapshot.val());
        }           
      });
    }

    TalkeeIM.prototype.getUserDetails = function(userId,cb){
      var self = this;
      firebase.database().ref('/users/' + userId).once('value', function(snapshot) {
        var udata = snapshot.val();
        if(udata != null){
          cb({id:snapshot.key,data:udata});
        }
      });
    }

    TalkeeIM.prototype.addNewUser = function(){
      var self = this;
      var userInfo = firebase.auth().currentUser;
      userId = userInfo.uid;
      console.log('165: new user data adding...')
      var data = {
        name: userInfo.displayName,
        avatar: userInfo.photoURL,
        status: 'available',
        createdAt: Date.now()
      };
      firebase.database().ref('/users/' + userId).set(data).catch(function(error) {
        console.error('Error writing new message to Firebase Database', error);  
        // 
      });
    }

    TalkeeIM.prototype.updateUserName = function(name){
      var self = this;
      if(name != ''){
        console.log('181: updateUserName')
        var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid;     
        firebase.database().ref('/users/' + userId+'/name').set(name).catch(function(error) {
          console.error('Error writing new message to Firebase Database', error);      //    
        });
      }
    }

    TalkeeIM.prototype.updateAvatarUrl = function(name){
      var self = this;
      if(name != ''){
        console.log('updateAvatarUrl ...')
        var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid;     
        firebase.database().ref('/users/' + userId+'/avatar').set(name).catch(function(error) {
          console.error('Error writing new message to Firebase Database', error);      //    
        });
      }
    }

    TalkeeIM.prototype.updateVolume = function(volume,cb){
      var self = this;
      if(volume != ''){
        console.log('updateVolume ...')
        var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid;     
        firebase.database().ref('/users/' + userId+'/volume').set(volume).then(function(){
          self.showNotifcation('Volume turned '+volume,function(){});
          cb();
        }).catch(function(error) {
          console.error('Error writing new message to Firebase Database', error);      //    
        });
      }
    }

    TalkeeIM.prototype.updateAutoplay = function(autoplay,cb){
      var self = this;
      if(autoplay != ''){
        console.log('updateAutoplay ...')
        var userInfo = firebase.auth().currentUser;
        if(userInfo){
          var userId = userInfo.uid;     
          
          firebase.database().ref('/users/' + userId+'/autoplay').set(autoplay).then(function(){          
            
            self._currentUser.autoplay = autoplay;
            cb();
          }).catch(function(error) {
            console.error('Error writing new message to Firebase Database', error);      //    
          });
        }
      }
    }
    TalkeeIM.prototype.updateNotification = function(state,cb){
      var self = this;
      if(state != ''){
        var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid;     
        firebase.database().ref('/users/' + userId+'/notification').set(state).then(function(){
          self.showNotifcation('Notification turned '+state,function(){});
          cb();
        }).catch(function(error) {
          console.error('Error writing new message to Firebase Database', error);      //    
        });
      }
    }

    // avatar upload event
    TalkeeIM.prototype.onMediaFileSelected = function(){   
      var self = this;
      //event.preventDefault();
      var file = event.target.files[0];
    
      // Clear the selection in the file picker input.
      $('#uploadAvatarForm').trigger("reset");
    
      // Check if the file is an image.
      //console.log(file.type);//audio/mp3
      if (!file.type.match('image.*')) {
        var data = {
          message: 'You can only upload image',
          timeout: 2000
        };
        //signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
        return;
      }
      self.saveAvatar(file);
    }

    TalkeeIM.prototype.saveAvatar= function(file) {  
      var self = this;
      if (file.type.match('image.*')) {
        // 2 - Upload the image to Cloud Storage.
        var userId = firebase.auth().currentUser.uid;
        var filePath = userId + '/' + 'avatar' + '/' + file.name;
        firebase.storage().ref(filePath).put(file).then(function(fileSnapshot) {
          // 3 - Generate a public URL for the file.
          fileSnapshot.ref.getDownloadURL().then((url) => {
            // 4 - Update the user avatar URL.
            var userId = firebase.auth().currentUser.uid;
            firebase.database().ref('/users/' + userId+'/avatar').set(url).then(function(){
              $('#uploadAvatarTrigger').hide();
              $('#uploadedAvatar').attr('src',url);
              $('#uploadedAvatar').show();     
                      
            }).catch(function(error) {
              console.error('Error writing new message to Firebase Database', error);      //    
              
            });
          });
        });
      
      }
    }

    TalkeeIM.prototype.initFirebaseAuth = function() {
        var self = this;
        // Listen to auth state changes.
        firebase.auth().onAuthStateChanged(function(user){
          if (user) {
            self.onUserUpdate();
            self.onDeletePortal();
            self.checkUserRequests();
            self.listenUserNotification();
            // console.log('user',user);
            // console.log('user.providerData',user.providerData[0].providerId);
            // register users if not 
            self.saveUserInfo(function(usertype){
              if(usertype == 'newuser'){
              var userInfo = firebase.auth().currentUser;
              // console.log(userInfo);   
              // console.log(userInfo.displayName);   
              // console.log(userInfo.uid);   
              var userId = userInfo.uid;   
              console.log('316: new user data adding...');
              var defaultUsername = (user.providerData[0].providerId == 'password')? self.emailsignupname : user.displayName;
              var data = {
                name: defaultUsername,
                avatar: self.defaultAvatar,
                status: 'online',
                onPage: 2, // on join portal page
                activePortalId: '',
                createdAt: Date.now()
              };
              firebase.database().ref('/users/' + userId).set(data).then(function(){
                self.updateUserStatus('Online',function(){});
                self.showPage();            
                self.onUserOffline();
              }).catch(function(error) {
                console.error('Error writing new message to Firebase Database', error);  
                // 
              });
              }
              else{
                self.updateUserStatus('Online',function(){});
                self.showPage();                        
                self.onUserOffline();
              }
    
            });
            
          } else { // User is signed out!    
            
              //$('#page-portal_select').hide();
              console.log('user not signed in');
              $('.page-dahsboard').hide();          
              $('#regsteps').show();
              $('.page').hide();
              $('#page-login').show(0,function(){
                self.readyRegSignForm('signin');
              });

              self.trackWantToJoinPortal();
          }
        });
    }

    TalkeeIM.prototype.checkUserRequests = function() {
      var self = this;
      var userId = firebase.auth().currentUser.uid;
      var callback2 = function(){
        self.getRequestsDetails(userId,function(reqData){
          var reqCount = reqData.numChildren();
          console.log('reqCount',reqCount);
          if(reqCount>0){
            $('.requestshandleUItrigger').show();
          }
          else{
            $('.requestshandleUItrigger').hide();
          }
      
        });
        if(self._currentChannel != '')
        self.showUsersOfChannel(self._currentChannel);
      }
      
      firebase.database().ref('/requests/users/'+userId).on('child_added', callback2);
      firebase.database().ref('/requests/users/'+userId).on('child_removed', callback2);
    }

    TalkeeIM.prototype.listenUserNotification = function() {
      var self = this;
      var userId = firebase.auth().currentUser.uid;
      var callback2 = function(snap){
        setTimeout(() => {
          var desc = snap.val();
          self.showNotifcation(desc,function(){
            firebase.database().ref('/notifications/'+userId+'/'+snap.key).remove();
          });   
        }, 1000);
        
      }
      firebase.database().ref('/notifications/'+userId).on('child_added', callback2);
    }

    TalkeeIM.prototype.onUserUpdate = function() {
      var self = this;
      // on update user data
      var userId = firebase.auth().currentUser.uid;
      var realtimeUpdate = firebase.database().ref('users/' + userId);
      realtimeUpdate.on('value', function(snapshot) {
        var data = snapshot.val();
        if(data != null){
          console.log('realtime update user data:' + userId);
          data.avatar = (data.avatar || ('images/icon/avatar1.jpg'));
          self.setCurrentUser(data);
          self._currentUserId = snapshot.key;
          $('.cuserAvatar').attr('src',data.avatar);
          $('.settingsUsername').html(data.name);
          $('.settingsUserstatus').html(data.status);
          $('.user-sidbarstatus, .settingsAvatarStatus').removeClass('Online Offline Away Busy').addClass(data.status);
          $('.user-sidbarstatus span:first').html(data.status);
          var volume = (data.volume)? data.volume: 'On';
          var autoplay = (data.autoplay)? data.autoplay: 'On';
          var notification = (data.notification)? data.notification: 'On';
          if(notification == 'Off'){
            $('#notificationCheckbox').prop('checked',false);             
            $('#notificationCheckbox').removeAttr('checked');             
          }
          $('.sound-button').attr('data-volume',volume);
          if(volume == 'Off'){
            $('.sound-button').find('img').attr('src','images/Volume_OFF.png');
            $('.sound-button').find('span').css('background-image','url(images/Volume_OFF.png)');
          }
          else{
            $('.sound-button').find('img').attr('src','images/Volume_ON.png');
            $('.sound-button').find('span').css('background-image','url(images/Volume_ON.png)');
          }
          
          // update ui
          var btnClass = (volume == 'On')? 'fa-volume-up': 'fa-volume-off';
          $('.sound-button').find('.fa').removeClass('fa-volume-up fa-volume-off').addClass(btnClass);
          
          self._currentChannel = (data.activeChannelId)? data.activeChannelId: '';
          console.log('On user update working vid = ' + data.vlayerid + ' vtoken, ' + data.vtoken);
          if (data.vtoken) {
            // set voicelayer token
            console.log("set token:" + data.vtoken);
            vTokenId = data.vtoken;
            voicelayer.auth.setToken(vTokenId);
            voicelayer.connect();
          }

          $('.autoplay-button').attr('data-autoplay',autoplay);
          
        }
      });
    }

    TalkeeIM.prototype.saveUserInfo = function(cb){
      var self = this;
      //58AcdPl9t1RhA0YG31aWDVfbAMq1
      // 58AcdPl9t1RhA0YG31aWDVfbAMq1
      console.log('saveuserinfo called')
      var userInfo = firebase.auth().currentUser;
      if(userInfo){
        var userId = userInfo.uid;  
        /* firebase.database().ref('/users/' + userId).once('value').then(function(snapshot) {
          if(snapshot.val() != null)
          addNewUser();
        }); */
        firebase.database().ref('/users/' + userId).once('value', function(snapshot) {
          //cb(snapshot.val());
          if(snapshot.val() == null){
            console.log('adding new user..');  
            cb('newuser');
          }
          else{
            cb('existing');
          }           
        });
      }  
    }

    TalkeeIM.prototype.updateUserStatus = function(status,cb){
      var self = this;
      if(status != ''){
        console.log('updateUserStatus : ' + status);
        var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid;     
        firebase.database().ref('/users/' + userId+'/status').set(status).then(function(){
          cb();
        }).catch(function(error) {
          console.error('Error writing new message to Firebase Database', error);      //    
        });
      }
    }

    TalkeeIM.prototype.protectOrSkipToPortal = function(portalData){
      var self = this;
      $('#regsteps, #page-join-portal-onsignin').show(0);
      if(portalData.data.password != ''){
        console.log('came here 486');
        var passform = $('.join-or-create-portal-pass');
        passform.attr('data-type','join');
        passform.attr('data-textOrId',portalData.id);
        passform.show();
        $('.join-or-create-portal').hide();                    
      }
      else{
        console.log('came here 2');
        // allow to join or create
        self.allowToJoinOrCreatePortal('join',portalData.id);
      }
    }

    TalkeeIM.prototype.showPage = function(){
      var self = this;
      console.log('page refreshed')
      
      var userInfo = firebase.auth().currentUser;
      var userId = userInfo.uid;   

      var autopState = (self.isOnMobile())? 'Off' : 'On';
          self.updateAutoplay(autopState,function(){
            
      });
      
      firebase.database().ref('/users/' + userId).once('value', function(snapshot) {
        var data = snapshot.val();
        if(data != null){
          if(data.onPage == 2){
            $('.page').hide();
            var trackedData = self.getTrackedPortal();
              var wantedToJoinPortal = trackedData.trackedPortalPath;
              if(wantedToJoinPortal != ''){
                self.getPortalByUrl(wantedToJoinPortal,function(portalData){
                  console.log(portalData);
                  if(portalData.id != null){
                    if(trackedData.joinId != ''){
                      // verify joinid for the portal
                      
                      self.verifyJoinLink(portalData.id,trackedData.joinId,firebase.auth().currentUser.email,function(result){
                        console.log('verifyJoinLink ',result)
                        if(result == true){
                          console.log('came here vjl true');
                          // allow to join or create
                          self.allowToJoinOrCreatePortal('join',portalData.id);
                          self.deleteJoinLink(portalData.id,trackedData.joinId);
                        }
                        else{
                          self.protectOrSkipToPortal(portalData);
                        }
                      });
                    }
                    else{
                      self.protectOrSkipToPortal(portalData);
                    }
                  }
                  else{
                    $('#regsteps, #page-portal_select').show(0,function(){
                      $('#page-portal_select').find('#join-portal-button').removeAttr('disabled')
                    });
                  }
                })
              }
              else{
                $('#regsteps, #page-portal_select').show(0,function(){
                  $('#page-portal_select').find('#join-portal-button').removeAttr('disabled')
                });
              }
            
          }
          else if(data.onPage == 3){
            $('.page').hide();
            $('#regsteps, #page-enterusername').show(0,function(){
              $('.usernametakeinput').focus()
            });
          }
          else if(data.onPage == 4){
            $('.page').hide();
            $('#regsteps, #page-enteravatar').show(0);
          }
          else if(data.onPage == 5){     
            if(data.activePortalId == ''){
              $('.page').hide();      
              // is a valid portal url path then get the portal id 
              /* data = {
                trackedPortalPath: '',
                joinId: ''
              } */
              
              var trackedData = self.getTrackedPortal();
              var wantedToJoinPortal = trackedData.trackedPortalPath;
              if(wantedToJoinPortal != ''){
                self.getPortalByUrl(wantedToJoinPortal,function(portalData){
                  console.log(portalData);
                  if(portalData.id != null){
                    if(trackedData.joinId != ''){
                      // verify joinid for the portal
                      
                      self.verifyJoinLink(portalData.id,trackedData.joinId,firebase.auth().currentUser.email,function(result){
                        console.log('verifyJoinLink ',result)
                        if(result == true){
                          console.log('came here vjl true');
                          // allow to join or create
                          self.allowToJoinOrCreatePortal('join',portalData.id);
                          self.deleteJoinLink(portalData.id,trackedData.joinId);
                        }
                        else{
                          self.protectOrSkipToPortal(portalData);
                        }
                      });
                    }
                    else{
                      self.protectOrSkipToPortal(portalData);
                    }
                  }
                  else{
                    $('#regsteps, #page-join-portal-onsignin').show(0);
                  }
                })
              }
              else{
                $('#regsteps, #page-join-portal-onsignin').show(0);
              }
              
            }
            else{
              // show active portal dashboard
              self._currentPortal = data.activePortalId;
              self.showActivePortalDashboard(data,self._currentPortal);
              // self.onDeletePortal();
            }
            
          }
          else{
            $('.page').hide();
            $('#page-portal_select').show(0,function(){
              $('#page-portal_select').find('#join-portal-button').removeAttr('disabled')
            });
          }
        }
        
      });
    }

    TalkeeIM.prototype.showActivePortalDashboard = function(userData,portalId){
      console.log("showActivePortalDashboard 640")
      var self = this;
      $('.page').hide();
      $('.cuserAvatar').attr('src',userData.avatar);
      $('.settingsUsername').html(userData.name);
      $('.settingsUserstatus').html(userData.status);
      
      self.getPortalDetails(portalId,function(data){
        $('.activePortallName').html(data.name+' / ');
        $('.activePortallName-s').html(data.name);
        var userPorName = data.name;
        if(data.url == ''){
          var portalURl = userPorName.replace(" ", "")+'.www.talkee.co.uk';
          $('.activePortallName-surl').html();
        }
        else{
          var portalURl = 'https://www.talkee.co.uk/app/'+data.url;       
        }
        self.resetTrackedPortal();
        $('.activePortallName-surl').html(portalURl);
        $('.activePortallName-surl').attr('title',portalURl);
        $('#page-dahsboard').show(0,function(){
          if(data.url){
            var crntParsedUrl = parseUrl(window.location.href);
            if(crntParsedUrl.resource == "localhost")
            var baseUrl = 'http://localhost/talkee/dist';
            else
            var baseUrl = 'https://www.talkee.co.uk/app';
            // history.pushState(null, null, baseUrl+'/'+data.url);
            window.history.replaceState("", "", baseUrl+'/'+data.url);
          }
          
          $('#regsteps').hide();      
          $('.dashboardPage').hide();      
          $('.mainDashboardContainer').show(0,self.onMaindDashboardShown());
          if(self._currentChannel != ''){
            self.showActiveChannelPage(self._currentChannel);
          }
        });
      })
    }

    TalkeeIM.prototype.showActiveChannelPage = function(channelId){
      console.log("showActiveChannelPage 683");
      var self = this;
      self.getChannelDetails(channelId,function(channelData){
        if(channelData.createdBy == firebase.auth().currentUser.uid){
          $('.channel-delete-btn').show();
        }
        else{
          $('.channel-delete-btn').hide();
        }
        var cName = channelData.name;
        self.setActiveChannel(channelId,function(){
          $('.activeChannelName').html(cName);
          $('.addmultiplethings').attr('data-add','user-to-channel');
          console.log(self._currentChannel);
          $('.dashboardPage').hide();
          $('.mainDashboardContainer').show(0,self.onMaindDashboardShown());
          $('.active-channel-users').html('').show();
          $('#active-portal-channels').hide();
          
          if(self._currentChannel != ''){
            self.showUsersOfChannel(self._currentChannel);
            $('.searchChannelOrUsers').show();
            $('.searchChannelOrUsers input').attr('data-search','users');
            $('.searchChannelOrUsers input').attr('placeholder','');//Search Users
            $('.channel-leave-btn').show();
            //self.subscribeTooChannelRoomMsgs(self._currentChannel,function(){});
            self.subscribeTooChannelNewRoomAddition(self._currentChannel);
            self.subscribeTooChannelMemberUpdates(self._currentChannel);
          }
        })

        self.ondeleteTheChannel(channelId,function(){});
      })
    }

    TalkeeIM.prototype.getPortalDetails = function(portalId,cb){
      var data = {};
      firebase.database().ref('/portals/' + portalId).once('value', function(snapshot) {
        data = snapshot.val();
        cb(data);
      });
    }

    TalkeeIM.prototype.updatePassOfPortal = function(portalId,hash,cb){
      var data = {};
      firebase.database().ref('/portals/' + portalId+'/password').set(hash).then(function(){
        cb();
      }).catch(function(error) {
        console.error('Error writing new message to Firebase Database', error);      //    
      });
    }

    TalkeeIM.prototype.onUserOffline = function(){
      var self = this;
      var userId = firebase.auth().currentUser.uid;
      var ref = firebase.database().ref('/users/' + userId+'/status');
      ref.onDisconnect().set("Offline").then(function(){
        console.log('offline worked')
      }).catch(function(error) {
        console.error('Error writing new message to Firebase Database', error);      //    
      });
      console.log('onUserOffline working ')
    }

    TalkeeIM.prototype.backToOnline = function(){
      var self = this;
      //var userId = firebase.auth().currentUser.uid;

      if(self._currentUser.status == 'Offline'){
        self.updateUserStatus('Online')
      }
      
    }

    TalkeeIM.prototype.setActivePortal = function(portalId,cb){
      var userId = firebase.auth().currentUser.uid;
      firebase.database().ref('/users/' + userId+'/activePortalId').set(portalId).then(function(){
        cb();
      }).catch(function(error) {
        console.error('Error writing new message to Firebase Database', error);      //    
      });
    }
    TalkeeIM.prototype.setActiveChannel = function(channelId,cb){
      var userId = firebase.auth().currentUser.uid;
      firebase.database().ref('/users/' + userId+'/activeChannelId').set(channelId).then(function(){
        cb();
      }).catch(function(error) {
        console.error('Error writing new message to Firebase Database', error);      //    
      });
    }
    TalkeeIM.prototype.resetActiveChannel = function(cb){
      var userId = firebase.auth().currentUser.uid;
      firebase.database().ref('/users/' + userId+'/activeChannelId').set('').then(function(){
        cb();
      }).catch(function(error) {
        console.error('Error writing new message to Firebase Database', error);      //    
      });
    }
    TalkeeIM.prototype.resetActiveChannelOfUser = function(userId,cb){      
      firebase.database().ref('/users/' + userId+'/activeChannelId').set('').then(function(){
        cb();
      }).catch(function(error) {
        console.error('Error writing new message to Firebase Database', error);      //    
      });
    }

    TalkeeIM.prototype.resetActivePortal = function(cb){
      var userId = firebase.auth().currentUser.uid;
      firebase.database().ref('/users/' + userId+'/activePortalId').set('').then(function(){
        // also reset active channel 
        firebase.database().ref('/users/' + userId+'/activeChannelId').set('').then(function(){   
          cb();
        }).catch(function(error) {
          console.error('Error writing new message to Firebase Database', error);      //    
        });        
      }).catch(function(error) {
        console.error('Error writing new message to Firebase Database', error);      //    
      });
    }

    TalkeeIM.prototype.getUserPortalList = function(userId,cb){
      firebase.database().ref('/portal-users/users/' + userId).once('value', function(snapshot) {
        var data = snapshot.val();
        var portals = new Array();
        if(data != null){
          snapshot.forEach(function(childSnapshot) {
            //console.log(childSnapshot)
            portals.push(childSnapshot.key);
          });
          cb(portals);
        }
      });
    }

    TalkeeIM.prototype.showSimilarPortals = function(serchText,cb){
      var self = this;
      var limit = 5;
      var ref = firebase.database().ref('portals').orderByChild('name').startAt(serchText).endAt(serchText+"\uf8ff").limitToFirst(limit).once('value', function(snap) {
        console.log('data', snap.val())
        var portals = new Array();
        //var portals = new Array();
        //$('#searched-portal-list').html('');
        snap.forEach(function(childSnapshot) {
          var snapVal = childSnapshot.val();
          portals.push({key:childSnapshot.key, name: snapVal.name});
          //portals.push({id: childSnapshot.key, name: snapVal.name});
          /* var tpl = `
            <tr data-portal-id="`+childSnapshot.key+`" data-selected="0">
              <td>`+snapVal.name+`</td>
              <td style="display: none"><i class="fa fa-check-circle"></i></td>
            </tr>
          `;
          $('#searched-portal-list').append(tpl);       */
        });
        cb(portals);
        //console.log(portals);   
     });
    }

    TalkeeIM.prototype.showSimilarChannels = function(serchText,cb){
      var limit = 5;
      var ref = firebase.database().ref('channels').orderByChild('name').startAt(serchText.toUpperCase()).endAt(serchText.toLowerCase()+"\uf8ff").once('value', function(snap) {
        console.log('data', snap.val())
        var channels = new Array();
        snap.forEach(function(childSnapshot) {
          var snapVal = childSnapshot.val();
          channels.push({key:childSnapshot.key, name: snapVal.name, createdBy: snapVal.createdBy});
        });
        cb(channels);
     });
    }

    TalkeeIM.prototype.updateOnPage = function(number){
      var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid; 
      firebase.database().ref('/users/' + userId+'/onPage').set(number).catch(function(error) {
        console.error('Error writing new message to Firebase Database', error);      //    
      });
    }

    TalkeeIM.prototype.updateOnPageWithCb = function(number,cb){
      var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid; 
      firebase.database().ref('/users/' + userId+'/onPage').set(number).then(function(){
        cb();
      }).catch(function(error) {
        console.error('Error writing new message to Firebase Database', error);      //    
      });
    }

    TalkeeIM.prototype.createPortal = function(data, cb){
      firebase.database().ref('/portals/').push(data).then(function(res){
        console.log(res.key);
        var activePortalId = res.key;
        var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid;     
        var data = {
          user: userId
        }
  
        firebase.database().ref('/portal-users/portals/'+res.key).child(userId)
        .set(userId).then(function(){
          firebase.database().ref('/portal-users/users/'+userId).child(res.key)
            .set(res.key).then(function(){
              cb({error: false,portalId:activePortalId});
            }).catch(function(error) {
              cb({error: true, msg: error});
            });;
        }).catch(function(error) {
          cb({error: true, msg: error});
        });
        
  
        
  
      }).catch(function(error) {
        cb({error: true, msg: error});
      });
    }
    TalkeeIM.prototype.ranIdGenerator = function () {
      var S4 = function() {
         return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
      };
      return (S4()+S4()+S4()+S4()+S4());
    }
    TalkeeIM.prototype.createOrJoinPortal = function(type, textOrId, cb){
      var self = this;
      var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid;     
        
      if(type == 'create'){

        var clean = textOrId.replace(/[^\w\s]/gi, '');
        clean = clean.split(' ').join('-');
        var data = {
          name: textOrId,
          avatar: "",
          isPrivate: "false",
          password: "",
          createdBy: userId,
          createdAt: Date.now(),
          url: clean
        }

        self.getPortalByUrl(clean,function(found){
          if(found.id == null){
            self.createPortal(data,function(result){
              cb(result);
            });
          }
          else{
            var ranId = self.ranIdGenerator();
            data.url = data.url + '-'+ranId;
            self.createPortal(data,function(result){
              cb(result);
            });
          }
        });
        
        
      }
      else{
        // join a portal directly 
        var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid;     
        var data = {
          user: userId
        }
        // save the relateion between portal and user
        firebase.database().ref('/portal-users/portals/'+textOrId).child(userId)
        .set(userId).then(function(){
          // on success
          firebase.database().ref('/portal-users/users/'+userId).child(textOrId)
            .set(textOrId).then(function(){
              cb({error: false,portalId:textOrId});
            }).catch(function(error) {
              cb({error: true, msg: error});
            });;
        }).catch(function(error) {
          cb({error: true, msg: error});
        });;
        
    
        
      }
    }

    
    TalkeeIM.prototype.saverUserPortalCollection = function(){
      // save user has portal relation 
      var userInfo = firebase.auth().currentUser;
      var userId = userInfo.uid;    
      var data = {
        portal: portalId
      }
      firebase.database().ref('/portal-users/users' + userId).set(data).then(function(){
        cb({error: false, msg: 'created'});
      }).catch(function(error) {
        console.error('Error writing new data to Firebase Database', error);  
      });
    }

    TalkeeIM.prototype.showUsersOfChannel = function(channelId){
      var self = this;
      $('.active-channel-users').html('');
      self._channelUsersList = new Array();
      firebase.database().ref('/channel-users/channels/' + channelId).once('value', function(snapshot) {
        $('.active-channel-users').html('');
        snapshot.forEach(function(childSnapshot) {        
          firebase.database().ref('/users/' + childSnapshot.key).once('value', function(snapshot) {
            var data = snapshot.val();
            if(data != null){
              self._channelUsersList.push({id:snapshot.key, data: snapshot.val()});      
              if(firebase.auth().currentUser.uid != snapshot.key){
                var username = (firebase.auth().currentUser.uid == snapshot.key)? 'You' : data.name;
                if($('.active-channel-users').find('#acid'+snapshot.key).length == 0){
                $('.active-channel-users').append(`
                <div class="iconItem icon-item-gray position-relative activateChatRoom" style="" data-vid="`+ data.vlayerid +`" data-vtoken="`+ data.vtoken +`" data-id="`+snapshot.key+`" id="acid`+snapshot.key+`">
                        <span class="avatarWithStatus image iconImage img-cir img-70 cursorPointer centerIconWrap" style="">
                        <img src="`+data.avatar+`" alt="`+username+`" class="">
                        </span>
                        <span class="iconName" style="">`+username+`</span>                        
                </div>
                `);
                self.subscribeToonUserStatusChange(snapshot.key);    
              }
              }
            }
          });
        });
      });  
    }

    TalkeeIM.prototype.subscribeToonUserStatusChange = function(userId){
      console.log('subscribing too '+userId+' status');
      var starCountRef = firebase.database().ref('users/' + userId+'/status');
      starCountRef.on('value', function(snapshot) {
        var data = snapshot.val();
        if(data != null){
          console.log(data);
          var targetEle = $('.active-channel-users').find('#acid'+userId).find('.avatarWithStatus');
          targetEle.removeClass('avatar-Online avatar-Offline avatar-Busy avatar-Away').addClass('avatar-'+data);
          targetEle.attr('data-status',data);
    
          var targetChatRec = $('.chatBox').find('#acidactive'+userId);
          if(targetChatRec.length != 0){        
            targetChatRec.find('.avatar-wrap').removeClass('online offline away busy').addClass(data.toLowerCase());
          }
          
        }
      });
    }

    TalkeeIM.prototype.createChannel = function(portalId,portalText, cb){
      var self = this;
      var data = {
        name: portalText,
        avatar: "",
        createdBy: firebase.auth().currentUser.uid,
        createdAt: Date.now(),
        portalId: portalId,
      };
      firebase.database().ref('/channels/').push(data).then(function(res){
        
        firebase.database().ref('/portal-channels/'+portalId).child(res.key)
          .set(res.key).then(function(){
            firebase.database().ref('/channel-users/users/'+self._currentUserId+'/'+portalId).child(res.key)
            .set(res.key).then(function(){
              var resutlt= {
                error: false
              };
              cb(resutlt);
            });
            
        });
        /* console.log(res.key);
        var userId = firebase.auth().currentUser.uid;
    
        firebase.database().ref('/channel-users/channels/'+res.key).child(userId)
            .set(userId);
        firebase.database().ref('/channel-users/users/'+userId+'/'+portalId).child(res.key)
            .set(res.key);
        self.addUserToChannel(userId,res.key,function(){
          
        }); */
        
    
        
    
      }).catch(function(error) {
        console.error('Error writing new data to Firebase Database', error);
        var resutlt= {
          error: true
        };
        cb(resutlt);
      });
    }

    TalkeeIM.prototype.getChannelDetails = function(channelId,cb){
      firebase.database().ref('/channels/' + channelId).once('value', function(snapshot) {
        cb(snapshot.val());
      });
    }

    TalkeeIM.prototype.getChannelUsers = function(channelId,cb){
      firebase.database().ref('/channel-users/channels/' + channelId).once('value', function(snapshot) {
        var members = [];
        snapshot.forEach(function(childSnapshot) {    
          members.push(childSnapshot.key);
        });
        cb(members);
      });
    }

    TalkeeIM.prototype.getChannelsListOnPortal = function(portalId,cb){
      firebase.database().ref('/portal-channels/' + portalId).once('value', function(snapshot) {
        var data = snapshot.val();
        var channels = new Array();
        if(data != null){
          snapshot.forEach(function(childSnapshot) {        
            channels.push(childSnapshot.key);
          });
          console.log(channels);
          cb(channels);
        }
      });
    }

    TalkeeIM.prototype.getMyChannelsOnPortal = function(portalId,cb){
      var userId = firebase.auth().currentUser.uid;
      firebase.database().ref('/channel-users/users/'+ userId+'/'+ portalId).once('value', function(snapshot) {
        var data = snapshot.val();
        console.log(data);    
        var channels = new Array();
        if(data != null){
          snapshot.forEach(function(childSnapshot) {    
            console.log(childSnapshot);    
            channels.push(childSnapshot.key);
          });
          console.log(channels);
          cb(channels);
        }
        else{
          cb(channels);
        }
      });
    }

    TalkeeIM.prototype.getUserJoinedChannelList = function(userId,portalId,cb){      
      firebase.database().ref('/channel-users/users/'+ userId+'/'+ portalId).once('value', function(snapshot) {
        var data = snapshot.val();
        console.log(data);    
        var channels = new Array();
        if(data != null){
          snapshot.forEach(function(childSnapshot) {    
            console.log(childSnapshot);    
            channels.push(childSnapshot.key);
          });
          console.log(channels);
          cb(channels);
        }
        else{
          cb(channels);
        }
      });
    }

    TalkeeIM.prototype.showSimilarUsersOfChannel = function(searchText,channelId,cb){
      var self = this;
      var container = $('.mainDashboardContainer .active-channel-users');
      container.html('');
      firebase.database().ref('/channel-users/channels/'+channelId).once('value', function(snapshot) {    
        var data = snapshot.val();
        console.log(data);    
        var users = new Array();
        if(data != null){
          container.html('');
          snapshot.forEach(function(childSnapshot) {  
            console.log(childSnapshot.key);
            self.getUserDetails(childSnapshot.key,function(userData){
              console.log(userData.data.name);
              if(searchText != ''){
                var cName = userData.data.name.toLowerCase();
                if(cName.search(searchText.toLowerCase()) != -1){
                  container.append(`
                  <div class="iconItem icon-item-gray" style="" data-vid="`+ userData.data.vlayerid +`" data-vtoken="`+ userData.data.vtoken +`" data-id="`+userData.id+`">
                      <span class="image iconImage img-cir img-70 cursorPointer centerIconWrap" style="">
                      <img src="`+userData.data.avatar+`" alt="" class="cuserAvatar">
                      </span>
                      <span class="iconName" style="">`+userData.data.name+`</span>                        
                  </div>
                  `);
                }  
              }
              else{
                console.log('on all -------------')
                container.append(`
                  <div class="iconItem icon-item-gray" style="" data-id="`+userData.id+`">
                      <span class="image iconImage img-cir img-70 cursorPointer centerIconWrap" style="">
                      <img src="`+userData.data.avatar+`" alt="" class="cuserAvatar">
                      </span>
                      <span class="iconName" style="">`+userData.data.name+`</span>                        
                  </div>
                  `);
              }
            })  
            
          }); 
        }
    
      });
    }

    TalkeeIM.prototype.showSimilarUsersOfChannelv2= function(searchText,channelId,cb){  
      var self = this;
      $('.active-channel-users').html('');
      console.log(self._channelUsersList)
      self._channelUsersList.forEach(function(cUser) { 
        // console.log('cUser.data.status ',cUser.data.status) 
        if(searchText != ''){
          var cName = cUser.data.name.toLowerCase();
          if(cName.search(searchText.toLowerCase()) != -1){
            if(firebase.auth().currentUser.uid != cUser.id){
          var username = (firebase.auth().currentUser.uid == cUser.id)? 'You' : cUser.data.name;

          $('.active-channel-users').append(`
          <div class=" iconItem icon-item-gray position-relative activateChatRoom" style="" data-vid="`+ cUser.data.vlayerid +`" data-vtoken="`+ cUser.data.vtoken +`" data-id="`+cUser.id+`" id="acid`+cUser.id+`" >
                  <span class="avatarWithStatus avatar-`+cUser.data.status+` image iconImage img-cir img-70 cursorPointer centerIconWrap" style="" data-status="`+cUser.data.status+`">
                  <img src="`+cUser.data.avatar+`" alt="`+username+`" class="">
                  </span>
                  <span class="iconName" style="">`+username+`</span>                        
          </div>
          `);
            }
          }
          }
          else{
            if(firebase.auth().currentUser.uid != cUser.id){
            var username = (firebase.auth().currentUser.uid == cUser.id)? 'You' : cUser.data.name;
            $('.active-channel-users').append(`
            <div class="position-relative activateChatRoom iconItem icon-item-gray" style="" data-vid="`+ cUser.data.vlayerid +`" data-vtoken="`+ cUser.data.vtoken +`" data-id="`+cUser.id+`" id="acid`+cUser.id+`">
            <span class="avatarWithStatus avatar-`+cUser.data.status+` image iconImage img-cir img-70 cursorPointer centerIconWrap" style="" data-status="`+cUser.data.status+`">
            <img src="`+cUser.data.avatar+`" alt="`+username+`" class="">
            </span>
            <span class="iconName" style="">`+username+`</span>                        
            </div>
          `);
            }
          }
      })
              
            
      
    }

    TalkeeIM.prototype.searchChannelsOnPortals = function(searchText,portalId,cb){
      var limit = 5;
      firebase.database().ref('channels').orderByChild('portalId').equalTo(portalId).once('value', function(snap) {
        console.log('data', snap.val())
        var channels = new Array();    
        searchText = searchText.toLowerCase();
        snap.forEach(function(childSnapshot) {
          var snapVal = childSnapshot.val();
          var cName = snapVal.name;
          cName = cName.toLowerCase();
          if(cName.search(searchText) != -1){
            channels.push({cId: childSnapshot.key, cData: snapVal});
          }  
        });
        cb(channels);
     });
    }

    TalkeeIM.prototype.getPortalByUrl = function(url,cb){      
      firebase.database().ref('portals').orderByChild('url').equalTo(url).limitToFirst(1).once('value', function(snap) {
        console.log('called getPortalByUrl');
        var data = {
          id: null,
          data: null,
        }
        snap.forEach(function(childSnapshot) {
          data = {
            id: childSnapshot.key,
            data: childSnapshot.val(),
          }
        });
        cb(data);
     })
     .catch(function(error) {
      console.error('Error reading Firebase Database', error);
      });
    }

    TalkeeIM.prototype.removeUserFromOtherChannels = function(userId,exchannelId,cb){
      var self = this;

      firebase.database().ref('/channel-users/users/'+ userId+'/'+ self._currentPortal).once('value', function(snapshot) {
        var data = snapshot.val();
        console.log(data);    
        var channels = new Array();
        if(data != null){
          snapshot.forEach(function(childSnapshot) {    
            console.log(childSnapshot);    
            channels.push(childSnapshot.key);
          });
          console.log(channels);
          
        }
        if(channels.length>0){
          console.log('found user channels : ',channels)
          channels = _.reject(channels, function(d){ return d === exchannelId; });
          console.log('found after reject user channels : ',channels)
        }
        // remove from channel
        if(channels.length>0)
        self.getUserDetails(userId,function(userData){
        channels.forEach(function(singleChannelId) {
          firebase.database().ref('/channel-users/channels/'+singleChannelId+'/'+userId).remove().then(function(){
            console.log('removed user '+userId+' from channel '+singleChannelId)
              // add notificatoin user left the channel
              self.getChannelUsers(singleChannelId,function(members){              
                self.getChannelDetails(singleChannelId,function(channelData){               
                  if(members.length>0){
                    var notiMsg = userData.data.name+' left the channel " '+channelData.name+'"';
                    self.addUsersNotifcation(members,notiMsg);
                  }
                });     
              });     
          }).catch(function(error) {
            console.error('Error writing Firebase Database', error); 
            cb(false)
          });
        });
        });

      });

      
      
    }

    TalkeeIM.prototype.addUserToChannel = function(userId,channelId,cb){
      var self = this;
      self.removeUserFromOtherChannels(userId,channelId,function(){});
      firebase.database().ref('/channel-users/channels/'+channelId).child(userId)
      .set(userId).then(function(){
        firebase.database().ref('/channel-users/users/'+userId+'/'+self._currentPortal).child(channelId)
          .set(channelId).then(function(){
            cb({error: false})
          });
      });
    }

    TalkeeIM.prototype.addUserToChannelListOnly = function(userId,channelId,cb){
      var self = this;
      self.removeUserFromOtherChannels(userId,channelId,function(){});
      firebase.database().ref('/channel-users/channels/'+channelId).child(userId)
      .set(userId).then(function(){
        cb({error: false})
      });
    }

    TalkeeIM.prototype.addChannelToUserListOnly = function(userId,channelId,cb){
      var self = this;      
      firebase.database().ref('/channel-users/users/'+userId+'/'+self._currentPortal).child(channelId)
      .set(channelId).then(function(){
        cb({error: false})
      });
    }

    TalkeeIM.prototype.showSimilarUsers = function(serchText){
      var limit = 5;
      var ref = firebase.database().ref('users').orderByChild('name').startAt(serchText.toUpperCase()).endAt(serchText.toLowerCase()+"\uf8ff").limitToFirst(limit).once('value', function(snap) {   
        $('.showsimilarusers').html('');
        snap.forEach(function(childSnapshot) {
          var snapVal = childSnapshot.val();
          var cId = firebase.auth().currentUser.uid;
          if(cId != childSnapshot.key){
          var tpl = `
          <li class="list-group-item d-flex justify-content-between align-items-center" data-id="`+childSnapshot.key+`">
          <div class="d-flex w-100 ">
              <div class="image img-cir img-30 toggleSettings cursorPointer  " >
                  <img src="`+snapVal.avatar+`" alt="`+snapVal.name+`" class="">
              </div>
              <div class="flex-grow-1 pl-3 pt-1">`+snapVal.name+`</div>
                  <button type="button" class="btn btn-primary btn-sm addusertochanneltrigger">ADD</button>
              </div>
          </li>
          `;
          $('.showsimilarusers').append(tpl);      
          }
        });
        //console.log(portals);   
     });
    }

    TalkeeIM.prototype.addNewRequestToChannel = function(channelId,cb){
      var self = this;
      // get channel creator
      self.getChannelDetails(channelId,function(channelData){
        var userId =  firebase.auth().currentUser.uid;  
        var creatorId = channelData.createdBy;
        firebase.database().ref('/requests/users/'+creatorId+'/'+channelId).child(userId)
        .set(userId).then(function(){
          cb();
        }).catch(function(error) {
          console.error('Error writing new data to Firebase Database', error);
        });
      });
      
    }

    TalkeeIM.prototype.getRequestsDetails = function(userId,cb){   
      firebase.database().ref('/requests/users/'+userId).once('value', function(snapshot) {
        cb(snapshot);
      });
    }

    TalkeeIM.prototype.showRequestsToChannels = function(){
      var self = this;
      var userId =  firebase.auth().currentUser.uid; 
      $('.channel-requests-holder').html('');
      self.getRequestsDetails(userId,function(reqData){
        if(reqData.val() !=null){
          reqData.forEach(function(reqChildSnapshot) {
            var channelId = reqChildSnapshot.key;
            self.getChannelDetails(channelId,function(channelData){
              if(channelData){
              var tpl = `<div class="channel-requests" data-reqUnder="`+userId+`" data-id="`+channelId+`">
              <p>Users want to join <span>`+channelData.name+`</span></p>
              <hr>
              <ul class="list-group list-group-flush mb-5" id="channelreq-`+channelId+`">                
                      
              </ul>
              </div>`;
              $('.channel-requests-holder').append(tpl);
              reqChildSnapshot.forEach(function(reqChild2Snapshot) {
                var reqByUserId = reqChild2Snapshot.key;
                firebase.database().ref('/users/' + reqByUserId).once('value', function(snapshot) {
                  var data = snapshot.val();
                  if(data != null){
                    var tpl = `
                    <li class="list-group-item d-flex text-white bg-info" data-requserid="`+reqByUserId+`">
                    <div class="image img-cir img-30">
                        <img src="`+data.avatar+`" alt="serivce" class="">
                    </div>
                    <div class="flex-grow-1 ml-3">
                        <span>`+data.name+`</span>
                    </div>
                    <div class="tools">
                            <i class="fa fa-times cursorPointer mr-3 deleterequesttochannel" aria-hidden="true"></i>
                            <i class="fa fa-check cursorPointer mr-3 addusertochannel" aria-hidden="true"></i>
                    </div>
                    </li>
                    `;
    
                    $('.channel-requests-holder').find('#channelreq-'+channelId).append(tpl);
                  }
                  else{
                    self.delRequestToChannel(channelId,userId,reqByUserId,function(){
                      
                    });
                  }
                });
              });
              }
              else{
                console.log('channel not found');
                // delete all req on this channel for this user
                firebase.database().ref('/requests/users/'+userId+'/'+channelId).remove().then(function() {
                  
                })
                .catch(function(error) {
                  console.log("Remove failed: " + error.message)
                });              
              }
            }); 
            // request by users on channel
            /* reqChildSnapshot.forEach(function(reqChild2Snapshot) {
              var rUserId = reqChild2Snapshot.key;
              console.log('userid', rUserId);
            }); */
              
    
          });
    
        }
      });
    }

    TalkeeIM.prototype.delRequestToChannel = function(cid,reqForUserId,requserId,cb){
      firebase.database().ref('/requests/users/'+reqForUserId+'/'+cid+'/'+requserId).remove().then(function() {
        cb();
      })
      .catch(function(error) {
        console.log("Remove failed: " + error.message)
      });
    }

    // chat handling

    TalkeeIM.prototype.setActiveChatRoomReciever = function(toMember){
      var self = this;
      self._activeChatRoomReceiver = {
        id: $('.active-channel-users').find('#acid'+toMember).attr('data-id'),
        name: $('.active-channel-users').find('#acid'+toMember).find('.iconName').html(),
        avatar: $('.active-channel-users').find('#acid'+toMember).find('img').attr('src'),
        status: $('.active-channel-users').find('#acid'+toMember).find('.avatarWithStatus').attr('data-status'),
      }
      $('.chatBox').find('.au-chat-info').attr('id','acidactive'+self._activeChatRoomReceiver.id)
      $('.chatBox').find('.au-chat-info').find('img').attr('src',self._activeChatRoomReceiver.avatar);
      $('.chatBox').find('.au-chat-info').find('.au-sender-name').text(self._activeChatRoomReceiver.name);
      var sString = self._activeChatRoomReceiver.status;
      $('.chatBox').find('.au-chat-info').find('.avatar-wrap').removeClass('online offline away busy').addClass(sString.toLowerCase());
    }

    TalkeeIM.prototype.activateTheChatRoom = function(reqData,cb){
      var self = this;
      var members = reqData.members;
      self.createChatRoom(members,function(roomId){
        // show chatbox and active the id;
        self._activeChatRoomId = roomId;
        cb(roomId);
      });
      
    }

    TalkeeIM.prototype.createChatRoom = function(members,cb){
      var self = this;
      self.areAlreadyInARoom(members,function(roomId){
        if(roomId == ''){
          // create room
    
          console.log('create room');
          self.createRoom(self._currentChannel,members,function(croomId){
            console.log('new room created ',croomId);
            
            self.addRoomOnChannel(self._currentChannel,croomId,function(){
              cb(croomId)
            })
          })
          
        }
        else{
          console.log('room already there '+roomId);
          cb(roomId);
        }
      });
    }

    TalkeeIM.prototype.isAMemberOfRoom = function(userId,roomId,cb){
      firebase.database().ref('/rooms/' + roomId).once('value', function(snapshot) {
        var data = snapshot.val();
        if(data != null){
        var found = false;
          snapshot.forEach(function(childSnapshot) {
            if(childSnapshot.key == userId){
              found = true;
            }
          });
          cb(found);
        }
      });
    }
    
    TalkeeIM.prototype.areAlreadyInARoom = function(members,cb){
      var self = this;
      firebase.database().ref('/channel-rooms/' + self._currentChannel).once('value', function(snapshot) {
        var data = snapshot.val();
        if(data != null){
          var found = false;
          var itemProcessed = 0;
          var numOfSnap = snapshot.numChildren();
          var callbackCalled = false;
          console.log('snapshot .numChildren()',snapshot.numChildren());
          snapshot.forEach(function(childSnapshot,index,snapArray) {
            console.log('found-up',found)
            if(found == false){
            self.getRoomMembers(childSnapshot.key, function(thisRoomMembers){
              if(self.arrayContainsAnotherArray(members, thisRoomMembers)){            
                found = true;
              }
              
              itemProcessed = itemProcessed+1;
              console.log('found',found,'itemProcessed',itemProcessed,'numOfSnap',numOfSnap)
              if((itemProcessed == numOfSnap) || (found == true)) {            
                if(!callbackCalled){
                  if(found)
                  cb(childSnapshot.key);
                  else{
                    cb('');
                  }
                  callbackCalled = true;
                }
              }
            });
            }
          });
        }
        else{
          cb('');
        }
      });
    }

    TalkeeIM.prototype.createRoom = function(channelId,members,cb){
      var self = this;
      var data = {};
      
      firebase.database().ref('/rooms/').push().then(function(res){
        console.log(res.key);
        var process = 0;
        members.forEach(function(memberId) {
          firebase.database().ref('/rooms/'+res.key).child(memberId)
          .set(memberId).then(function(){
            process++;
            if(process == members.length){
              cb(res.key);
            }
          });
    
        });
        
      });
    }

    TalkeeIM.prototype.addRoomOnChannel = function(cid,rid,cb){
      firebase.database().ref('/channel-rooms/'+cid).child(rid)
      .set(rid).then(function(){
        cb();
      });
    }

    TalkeeIM.prototype.getRoomMembers = function(roomId, cb){
      firebase.database().ref('/rooms/' + roomId).once('value', function(snapshot) {
        var members = new Array();
        var data = snapshot.val();
        if(data != null){
          snapshot.forEach(function(childSnapshot) {
    
            members.push(childSnapshot.key);
    
          });
          cb(members);
        }
        else{
          cb(members);
        }
      });
    }

    TalkeeIM.prototype.arrayContainsAnotherArray = function(needle, haystack){
      for(var i = 0; i < needle.length; i++){
        if(haystack.indexOf(needle[i]) === -1)
           return false;
      }
      return true;
    }

    // voice layer play existing message
    $(document).on('click', '.audiojs .vplay', function(event){
      if(self._activeChatRoomId == ''){
        self.showNotifcation('Please select user.',function(){});
        return false;
      }

      //show pause button
      var play_btn = $(this);
      var pause_btn = $(this).next();
      $(this).hide();
      $(this).next().show();

      voicelayer.messages.play($(this).attr('msg-id'));
      var full_width = $(this).parent().next().width();

      //show play button after duration
      $(this).parent().next().find('.progress').animate(
        {width: full_width + "px"},
        {
          duration: 1000 * $(this).attr('duration') + 1500,
          complete: function() {
            $(play_btn).show();
            $(pause_btn).hide();
            $(this).width(0);
          }
        } 
      );

    });

    TalkeeIM.prototype.showVoiceLayer = function(msgData) {  
      var self = this;
      var messageElement = $('#talkeeChatMainBox');
      var tpl = '';
      var userId = firebase.auth().currentUser.uid;

      //get current user
      if (msgData.type == 'voice'){

        self.getUserDetails(userId, function(userData){

          if (userData.data.vlayerid == msgData.user.id){
            // sent msg 
            tpl = `
            <div class="send-mess-wrap mess-item" id="mess-id-`+msgData.id+`">
              <div class="send-mess__inner">
                  <div class="send-mess-list">
                      <div class="send-mess mess-audio">

                        <div class="audiojs" classname="audiojs" id="audiojs_wrapper0">
                          <div class="play-pause">
                            <p class="play vplay" msg-id="` + msgData.id + `" duration="` + Number(msgData.duration).toFixed(1) + `"><i class="fa fa-play"></i></p>
                            <p class="pause" style='display:none;'><i class="fa fa-pause"></i></p>
                          </div>
                          <div class="scrubber">
                            <div class="progress" style="width: 0px; position: relative;"></div>
                          </div>
                          <div class="time">
                            <em class="played">` + Number(msgData.duration).toFixed(1)  + `s</em>
                            <strong class="duration">` + Number(msgData.duration).toFixed(1)  + `s</strong>
                          </div>
                          <div class="error-message"></div>
                        </div>

                      </div>
                      <div class="prog-wrap"></div>
                  </div>
              </div>
              <span class="mess-time">` + msgData.created_at.replace('T', ' ').slice(0, -8) + `</span>
            </div>
            `;
          }
          else {
            // received msg
            tpl = `
            <div class="recei-mess-wrap mess-item" id="mess-id-`+msgData.id+`">
              <div class="recei-mess__inner">
                  <div class="avatar avatar--tiny">
                      <img src="`+self._activeChatRoomReceiver.avatar+`" alt="">
                  </div>
                  <div class="recei-mess-list">
                      <div class="recei-mess mess-audio">

                        <div class="audiojs" classname="audiojs" id="audiojs_wrapper1">
                          <div class="play-pause">
                            <p class="play vplay" msg-id="` + msgData.id + `" duration="` + Number(msgData.duration).toFixed(1) + `"><i class="fa fa-play"></i></p>
                            <p class="pause" style='display:none;'><i class="fa fa-pause"></i></p>
                          </div>
                          <div class="scrubber">
                            <div class="progress" style="width: 0px; position: relative;"></div>
                          </div>
                          <div class="time">
                            <em class="played">` + Number(msgData.duration).toFixed(1)  + `s</em>
                            <strong class="duration">` + Number(msgData.duration).toFixed(1)  + `s</strong>
                          </div>
                          <div class="error-message"></div>
                        </div>

                      </div>
                      <div class="prog-wrap"></div>
                  </div>
              </div>
              <span class="mess-time">` + msgData.created_at.replace('T', ' ').slice(0, -8) + `</span>
            </div>
            `;
          }
        
        });
      }

      var existing = messageElement.find('#mess-id-'+msgData.id);
      if(existing.length == 0) {
        console.log("adding : " + msgData.id);
        messageElement.append(tpl);
      } else{
        console.log("replace : " + msgData.id);
        existing.replaceWith(tpl);
      }

      var element = document.getElementById("talkeeChatMainBox");
      element.scrollTop = element.scrollHeight;
      // messageElement.focus();
      imgLoaded( '#talkeeChatMainBox', function() {
        var element = document.getElementById("talkeeChatMainBox");
        element.scrollTop = element.scrollHeight;
      });

    }

    TalkeeIM.prototype.loadMessages = function(roomId) {
      var self = this;
      // Loads the last 12 messages and listen for new ones.
      var callback = function(snap) {
        console.log('loading messages callback working...')
        var data = snap.val();
        var msgData = {
          id: snap.key,           
          name: data.name,
          msg: data.message, 
          url: data.url,
          mime: data.mime,
          type: data.type,
          userId: data.userId,
          timestamp: self.timeInReadableFormat(data.timestamp),
        };
        if(data.userId != firebase.auth().currentUser.uid){
          if($('.talkeeChatUi').find('.au-chat-info').attr('id') == 'acidactive'+data.userId){
            self.displayMessage(msgData,false);
          }

        }
        else{
          self.displayMessage(msgData,false);
        }
        
      };
    
      firebase.database().ref('/messages/'+self._activeChatRoomId).limitToLast(12).on('child_added', callback);
      firebase.database().ref('/messages/'+self._activeChatRoomId).limitToLast(12).on('child_changed', callback);
      /* var callback2 = function(snap) {
        console.log('last callback working...');
        self.autoplayLastAudio();

      };
      firebase.database().ref('/messages/'+self._activeChatRoomId).limitToLast(1).on('child_added', callback2);
      firebase.database().ref('/messages/'+self._activeChatRoomId).limitToLast(1).on('child_changed', callback2); */

      // add existing messages to channel
      console.log("load messages in global vchanel :" + vChannelId);
      voicelayer.channels.getMessages(vChannelId, function(err, data) {
        var i = data.length;
        while (i--) {
          if (data[i].type === "voice") {
            self.showVoiceLayer(data[i]);
          }
        }
      });

      // play real time message
      voicelayer.on("message:create", function(data) {
        console.log("on message created ..." + data.id);
        if (data.channel_id !== vChannelId) {
          console.log("wrong channel, message channel = " + data.channel_id + ", current channel = " + vChannelId);
          return;
        }
        if (data.type === "voice") {
          $('#now_player_icon').show();
          console.log("playing realtime message now..." + data.id);
          voicelayer.messages.play(data.id);
        }
      });

      voicelayer.on("message:update", function(data) {
        $('#now_player_icon').hide();
        // Update duration of voice message
        if (data.duration > 0) {
          console.log("message updated, will added :" + data.id);
          self.showVoiceLayer(data);
        }
      });
      
    }

    TalkeeIM.prototype.CustomDownload = function(name,url) {  
      console.log('down working');
        var a = document.createElement('a');
        var linkText = document.createTextNode("data");
        a.appendChild(linkText);
        a.title = "file";
        a.target= "_blank";
        a.href = url;
        a.setAttribute('download',name);
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
    TalkeeIM.prototype.autoplayLastAudio = function() {  
      var self = this;
      var autoplay = (self._currentUser.autoplay)? self._currentUser.autoplay : 'On';
      console.log('autoplayLastAudio working ');
      if(autoplay == 'On'){
        var ele = $('#talkeeChatMainBox').find('.mess-item:last');
        if(ele.hasClass('recei-mess-wrap')){
          ele = ele.find('.audioele');
          console.log('ele length : '+ele.length)
          var source = ele.find('source');
          if(source.length >0){
            ele.trigger("play");
            console.log('on right play working ');
          }
        }
      }
    }
    // Displays a Message in the UI.
    TalkeeIM.prototype.displayMessage = function(msgData,autoplayCheck) {  
      var self = this;
      var messageElement = $('#talkeeChatMainBox');
      var tpl = '';
      if (msgData.type == 'text') { // If the message is text.
        if(msgData.userId == firebase.auth().currentUser.uid){
          // send msg 
          tpl = `
          <div class="send-mess-wrap mess-item" id="mess-id-`+msgData.id+`">                                            
            <div class="send-mess__inner">
                <div class="send-mess-list">
                    <div class="send-mess">`+msgData.msg+`</div>
                </div>
            </div>
            <span class="mess-time">`+msgData.timestamp+`</span>
        </div>
          `;
        }
        else{
          // received msg
          tpl = `
            <div class="recei-mess-wrap mess-item" id="mess-id-`+msgData.id+`">     
            <div class="recei-mess__inner">
                <div class="avatar avatar--tiny">
                    <img src="`+self._activeChatRoomReceiver.avatar+`" alt="">
                </div>
                <div class="recei-mess-list">
                    <div class="recei-mess">`+msgData.msg+`</div>
                </div>
            </div>
            <span class="mess-time">`+msgData.timestamp+`</span>
            </div>
          `;
        }
      } 
      else if (msgData.type == 'file'){
        
        var downIcon = (msgData.url == '')? '' : `<a class="file-downicon" href="#" data-name="`+msgData.name+`" data-src="`+msgData.url+`" ><i class="fa fa-download"></i></a>`;
        var fileName = (msgData.name.length>=13)? msgData.name.substring(0, 13)+'...': msgData.name;
        var msg = `<span title="`+msgData.name+`">`+fileName+`</span> `;
        var isImage = _.contains(self._validImageTypes,msgData.mime);
        if(isImage){
          var imageUrl = (msgData.url == '')? self._loadingImageUrl: msgData.url;
          msg = `<span><img src="`+imageUrl+`" alt=""></span> `;
          downIcon = '';
        }
        if(msgData.userId == firebase.auth().currentUser.uid){
          // send msg 
          tpl = `
          <div class="send-mess-wrap mess-item" id="mess-id-`+msgData.id+`">                                            
            <div class="send-mess__inner">
                <div class="send-mess-list">
                  <div class="send-mess mess-file">                   
                    `+msg+`
                    `+downIcon+`
                  </div>
                  <div class="prog-wrap"></div>
                </div>
                
            </div>
            <span class="mess-time">`+msgData.timestamp+`</span>
          </div>
          `;
        }
        else{
          // received msg
          tpl = `
          <div class="recei-mess-wrap mess-item" id="mess-id-`+msgData.id+`">                                         
          <div class="recei-mess__inner">
              <div class="avatar avatar--tiny">
                  <img src="`+self._activeChatRoomReceiver.avatar+`" alt="User Name">
              </div>
              <div class="recei-mess-list">
                  <div class="recei-mess mess-file">                   
                          `+msg+`
                          `+downIcon+`
                  </div>
                  <div class="prog-wrap"></div>
              </div>
          </div>
          <span class="mess-time">`+msgData.timestamp+`</span>
          </div>
          `;
        }
      }
      else if (msgData.type == 'voice'){
        var autoplay = '';
        if(msgData.url != ''){
          // var autoplay = (self._currentUser.autoplay)? self._currentUser.autoplay : 'On';
          // autoplay = (autoplay == 'On')? 'autoplay': ''; 

          var volume = (self._currentUser.volume)? self._currentUser.volume : 'On';
          volume = (volume == 'On')? '': 'muted'; 
        }

        var audio = (msgData.url == '')? '<span class="audioele upprocess">Uploading ...</span>': `<audio class="audioele" controls="" `+autoplay+`  `+volume+` style="" preload="none">
          <source src="`+msgData.url+`" type="audio/wav">
          Your browser does not support the audio element.
        </audio>`;
        if(msgData.userId == firebase.auth().currentUser.uid){
          // send msg 
          
          tpl = `
          <div class="send-mess-wrap mess-item" id="mess-id-`+msgData.id+`">                                            
            <div class="send-mess__inner">
                <div class="send-mess-list">
                    <div class="send-mess mess-audio">
                      `+audio+`
                    </div>
                    <div class="prog-wrap"></div>
                </div>
            </div>
            <span class="mess-time">`+msgData.timestamp+`</span>
          </div>
          `;
        }
        else{
          // received msg
          tpl = `
          <div class="recei-mess-wrap mess-item" id="mess-id-`+msgData.id+`">     
          <div class="recei-mess__inner">
              <div class="avatar avatar--tiny">
                  <img src="`+self._activeChatRoomReceiver.avatar+`" alt="">
              </div>
              <div class="recei-mess-list">
                  <div class="recei-mess mess-audio">
                  `+audio+`
                  </div>
                  <div class="prog-wrap"></div>
              </div>
          </div>
          <span class="mess-time">`+msgData.timestamp+`</span>
          </div>
          `;
        }
      }
      var existing = messageElement.find('#mess-id-'+msgData.id);
      if(existing.length == 0)
      messageElement.append(tpl);
      else{
        existing.replaceWith(tpl);
      }
      if ((msgData.type == 'voice') && (msgData.url != '')){
        //var exaAE = messageElement.find('#mess-id-'+msgData.id).find('audio');    
        var baseElement = document.getElementById('mess-id-'+msgData.id); 
        var exaAE  = baseElement.querySelectorAll(".audioele")
        self.createAudioPlayer(exaAE);
      }
      var element = document.getElementById("talkeeChatMainBox");
      element.scrollTop = element.scrollHeight;
      // messageElement.focus();
      imgLoaded( '#talkeeChatMainBox', function() {
        console.log('its working')          
        var element = document.getElementById("talkeeChatMainBox");
        element.scrollTop = element.scrollHeight;
      });
    }

    TalkeeIM.prototype.saveMessage = function(messageText) {      
      var self = this;
      // Add a new message entry to the Firebase Database.
      var data = {
        userId: firebase.auth().currentUser.uid,
        name: '', 
        message: messageText,
        type: 'text',
        url: '',
        timestamp: Date.now()
      }
      return firebase.database().ref('/messages/'+self._activeChatRoomId).push(data).then(function(){
    
      }).catch(function(error) {
        console.error('Error writing new real message to Firebase Database', error);
      });
    }

    TalkeeIM.prototype.onMessageFormSubmit = function() {
      var self = this;
      var msg = $('.au-input').val();
      if ((msg !='') && (self._activeChatRoomId != '')) {
        $('.au-input').val('');
        self.saveMessage(msg).then(function() {
          // ui handling
    
        });
      }
    }

    TalkeeIM.prototype.timeInReadableFormat = function(timestamp) {
      var date = (timestamp) ? new Date(timestamp) : new Date(),
      hours = date.getHours() || 12,
      minutes = '' + date.getMinutes(),
      ampm = (date.getHours() >= 12) ? 'pm' : 'am';
      console.log(hours, minutes, ampm);
      hours = (hours > 12) ? hours - 12 : hours;
      minutes = (minutes.length < 2) ? '0' + minutes : minutes;  
      return '' + hours + ':' + minutes +' '+ampm;
    }

    TalkeeIM.prototype.convertToKB = function(bytes) {
      bytes=(bytes/1024).toFixed(2);
      return bytes;
    }

    // file upload handling
    TalkeeIM.prototype.onMediaFileSelectedForFileUPloading = function(event) {
      var self = this;
      event.preventDefault();
      var file = event.target.files[0];
      
      document.getElementById("fileUploadCapture").value = "";
      // Clear the selection in the file picker input.
      //imageFormElement.reset();

      // Check if the file is an image.
      var fileSizeInKB = self.convertToKB(file.size);
      console.log(file.type, fileSizeInKB, file.name,file);//audio/mp3
      if(fileSizeInKB>0 && (fileSizeInKB<=20480)){ // within 20mb
        var isValidFile = _.contains(self._validFileTypes,file.type);
        if(isValidFile){
          //if (!file.type.match('image.*') && !file.type.match('audio/mp3')) {
            /* var data = {
              message: 'You can only share images/audio',
              timeout: 2000
            }; */
            console.log('isValidFile',isValidFile);
            self.saveFileOnServer(file,function(){
              // update any ui or message 
              console.log('File Uploaded');
            });
            return;
        }
        else{
          self.showNotifcation('This file type not supported',function(){});
          return;
        }
      }
      else{
        self.showNotifcation('Upload File within 20MB',function(){});
        return;
      }
      
      
    }

    TalkeeIM.prototype.saveFileOnServer = function(file,cb) {
      var self = this;
      var data = {
        userId: firebase.auth().currentUser.uid,
        name: file.name, 
        message: '',
        type: 'file',
        mime: file.type,
        url: '',
        timestamp: Date.now()
      }
      firebase.database().ref('/messages/'+self._activeChatRoomId).push(data).then(function(messageRef) {
        // 2 - Upload the image to Cloud Storage.
        var filePath = firebase.auth().currentUser.uid + '/' + messageRef.key + '/' + file.name;
        var uploadTask =  firebase.storage().ref(filePath).put(file);
        /* .then(function(fileSnapshot) {
          // 3 - Generate a public URL for the file.
          return fileSnapshot.ref.getDownloadURL().then((url) => {
            // 4 - Update the chat message placeholder with the image's URL.
            return messageRef.update({
              url: url,
            });
          });
        }); */

        uploadTask.on('state_changed', function(snapshot){
          // Observe state change events such as progress, pause, and resume
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          
          var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

          var progressTpl = `<div class="progress mb-2" style="height: 5px;">
            <div class="progress-bar bg-info" role="progressbar" style="width: `+progress+`%;" aria-valuenow="`+progress+`" aria-valuemin="0" aria-valuemax="`+progress+`"></div>
          </div>`;
          $('#talkeeChatMainBox').find('#mess-id-'+messageRef.key).find('.prog-wrap').html(progressTpl);
          console.log('Upload is ' + progress + '% done');
          switch (snapshot.state) {
            case firebase.storage.TaskState.PAUSED: // or 'paused'
              console.log('Upload is paused');
              break;
            case firebase.storage.TaskState.RUNNING: // or 'running'
              console.log('Upload is running');
              break;
          }
        }, function(error) {
          // Handle unsuccessful uploads
        }, function() {
          // Handle successful uploads on complete
          // For instance, get the download URL: https://firebasestorage.googleapis.com/...
          uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
            messageRef.update({
              url: downloadURL,
            });
          });
        });


      }).catch(function(error) {
        console.error('There was an error uploading a file to Cloud Storage:', error);
      });
    } 

    TalkeeIM.prototype.saveVoiceOnServer = function(file,cb) {
      var self = this;
      var data = {
        userId: firebase.auth().currentUser.uid,
        name: 'voice-record', 
        message: '',
        type: 'voice',
        mime: file.type,
        url: '',
        timestamp: Date.now()
      }
      firebase.database().ref('/messages/'+self._activeChatRoomId).push(data).then(function(messageRef) {
        // upload file local file storage
        
        var form_data = new FormData();                  
        form_data.append('file', file);
        console.log(form_data);                             
        $.ajax({
            url: 'upload.php', // point to server-side PHP script 
            dataType: 'json',  // what to expect back from the PHP script, if anything
            cache: false,
            contentType: false,
            processData: false,
            data: form_data,                         
            type: 'post',
            success: function(upData){
                console.log(upData); // display response from the PHP script, if any
                setTimeout(() => {
                  messageRef.update({
                    url: upData.filePath,
                  });
                }, 500);
                
            }
        });
        
        //  - Upload file to firebase Cloud Storage.

        /*var filePath = firebase.auth().currentUser.uid + '/' + messageRef.key + '/' + file.name;
         var uploadTask =  firebase.storage().ref(filePath).put(file);        

        uploadTask.on('state_changed', function(snapshot){
          // Observe state change events such as progress, pause, and resume
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          
          var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

          var progressTpl = `<div class="progress mb-2" style="height: 5px;">
            <div class="progress-bar bg-info" role="progressbar" style="width: `+progress+`%;" aria-valuenow="`+progress+`" aria-valuemin="0" aria-valuemax="`+progress+`"></div>
          </div>`;
          $('#talkeeChatMainBox').find('#mess-id-'+messageRef.key).find('.prog-wrap').html(progressTpl);
          console.log('Upload is ' + progress + '% done');
          switch (snapshot.state) {
            case firebase.storage.TaskState.PAUSED: // or 'paused'
              console.log('Upload is paused');
              break;
            case firebase.storage.TaskState.RUNNING: // or 'running'
              console.log('Upload is running');
              break;
          }
        }, function(error) {
          // Handle unsuccessful uploads
        }, function() {
          // Handle successful uploads on complete
          // For instance, get the download URL: https://firebasestorage.googleapis.com/...
          uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
            messageRef.update({
              url: downloadURL,
            });
          });
        }); */


      }).catch(function(error) {
        console.error('There was an error uploading a file to Cloud Storage:', error);
      });
    }

    TalkeeIM.prototype.startRecording =  function() {
      self = this;
      //alert('start recording called');
      
      /* let onFail = function(e) {
        alert('Error '+e);
        console.log('Rejected!', e);
      };

      let onSuccess = function(s) {
        
        console.log('Recording...');
        self._voiceTracks = s.getTracks();        
        let context = new AudioContext();
        self._audioStream = context.createMediaStreamSource(s);
        self._voiceRecorder = new Recorder(self._audioStream);
        self._voiceRecorder.record();
        //alert('record started');
        
      }
      
      if (navigator.getUserMedia) {
				
				navigator.getUserMedia({audio: true}, onSuccess, onFail); 																			
			} else {
				alert('navigator.getUserMedia not present');
      } */
      
      // New instance
      self._voiceRecorder = new MicRecorder({
        bitRate: 64
      });

      self._voiceRecorder.start().then(() => {
        // something else
      }).catch((e) => {
        console.error(e);
      });

    }

    TalkeeIM.prototype.stopRecording =  function() {
      //alert('stop recording called');
      var self = this;
      if(self._voiceRecorder != null){
        console.log('Stop Recording...');
        //alert('Stop Recording...');
        
        /* self._voiceRecorder.stop();
        self._voiceTracks.forEach(track => track.stop());
        self._voiceRecorder.exportWAV(function(s) {          
          self.saveVoiceOnServer(s);
          //alert('record saving');
          self._voiceRecorder = null;
        }); */
        
        self._voiceRecorder
        .stop()
        .getMp3().then(([buffer, blob]) => {
          // do what ever you want with buffer and blob
          // Example: Create a mp3 file and play
          const file = new File(buffer, 'voice.mp3', {
            type: blob.type,
            lastModified: Date.now()
          });
          if (buffer.length > 11) {
            self.saveVoiceOnServer(file);
            self._voiceRecorder = null;
          } else {
            console.log("buffer length too short : " + buffer.length);
          }
          // const player = new Audio(URL.createObjectURL(file));
          // player.play();
        
        }).catch((e) => {
          self.showNotifcation('We could not retrieve your message',function(){});
          console.log(e);
        });
      }
    }

    /* TalkeeIM.prototype.startRecording =  function() {
      var self = this;
      // var AudioContext = window.AudioContext || window.webkitAudioContext;
      var audioContext = new AudioContext; //new audio context to help us record
      var constraints = { audio: true, video:false };
   
      navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
          console.log("getUserMedia() success, stream created, initializing Recorder.js ...");
          
          
          self._audioStream = stream;
    
          
          var input = audioContext.createMediaStreamSource(self._audioStream);
    
          
          self._voiceRecorder = new Recorder(input,{numChannels:1})
    
          //start the recording process
          self._voiceRecorder.record()
    
          console.log("Recording started");
    
      }).catch(function(err) {
          //enable the record button if getUserMedia() fails
          // recordButton.disabled = false;
          // stopButton.disabled = true;
          // pauseButton.disabled = true
          console.log(err);
      });
      
    }

    TalkeeIM.prototype.stopRecording =  function() {
      var self = this;
      if(self._voiceRecorder != null){
        console.log('stopping recording')
      //tell the recorder to stop the recording
      self._voiceRecorder.stop();
          
      //stop microphone access
      self._audioStream.getAudioTracks()[0].stop();

      //create the wav blob and pass it on to createDownloadLink
      self._voiceRecorder.exportWAV(function(blob){
        // var url = URL.createObjectURL(blob);
        self.saveVoiceOnServer(blob);
        // console.log('url',url);
        self._voiceRecorder = null;
        // saveImageMessage(blob,true);
      });

      }
    } */

    TalkeeIM.prototype.recordCounter =  function(time,ele) {
      var self = this;
      self._lastTimer = setTimeout(function () {    
          var secondsgoing = '';  
          secondsgoing = (self.recordIterator>1)? ' Seconds' : ' Second';  
          secondsgoing = self.recordIterator + secondsgoing;    
          ele
          .attr('data-original-title', secondsgoing)
          .tooltip('show');
          time = 1000;
          self.recordIterator = self.recordIterator+1;
          console.log('record timer ', self.recordIterator);
          if(self.recordIterator == self.recordTimout){
            self.stopCounter(0,ele);
            self.stopRecording();
            console.log('record timeout');
          }
          else
          self.recordCounter(time,ele);
          
      }, time);
    }

    TalkeeIM.prototype.stopCounter =  function(time,ele) {
      var self = this;
      clearTimeout(self._lastTimer);
      self.recordIterator = 1;
      ele.attr('data-recording',0);   
      ele.removeClass('red-back');   
      ele.tooltip('dispose');
      console.log('record counter stopped');
    }
    TalkeeIM.prototype.subscribeTooChannelMemberUpdates =  function(channelId) {
      var self = this;
      var isAlreadySubscribed = _.contains(self.channelSubscribes,channelId);   
      var callback = function(){
        console.log('subscribeTooChannelMemberUpdates callback working');
        if(self._currentChannel != '')
        self.showUsersOfChannel(self._currentChannel);
      }   
      var callback2 = function(snap){
        console.log('subscribeTooChannelMemberUpdates callback working');
        if(self._currentChannel != '')
        self.showUsersOfChannel(self._currentChannel);
        var userId = snap.key;
        if(userId == firebase.auth().currentUser.uid){
          // check user using this same channel now then back
          $('.backtomainportal').trigger('click');
        }
      }   
      if(!isAlreadySubscribed){
        console.log('subscribeTooChannelMemberUpdates working ',self._currentChannel);
        self.channelSubscribes.push(self._currentChannel);
        firebase.database().ref('/channel-users/channels/'+channelId).on('child_added', callback);
        firebase.database().ref('/channel-users/channels/'+channelId).on('child_removed', callback2);
      }
    }
    TalkeeIM.prototype.subscribeTooChannelRoomMsgs =  function(channelId,cb) {
      var self = this;
      if(channelId != '')
      firebase.database().ref('/channel-rooms/' + channelId).once('value', function(snapshot) {
        var data = snapshot.val();
        if(data != null){
          console.log('roomsubscribes: ',self.roomSubscribes);
          snapshot.forEach(function(childSnapshot) {
            var roomId = childSnapshot.key;
            var isAlreadySubscribed = _.contains(self.roomSubscribes,roomId);
            console.log('isAlreadySubscribed',isAlreadySubscribed)
            if(!isAlreadySubscribed){
              

              
              self.isAMemberOfRoom(firebase.auth().currentUser.uid,roomId,function(result){
                if(result ){
                console.log('subscribing too room msg : '+roomId)
                self.roomSubscribes.push(roomId);
                
                var callback = function(snap) {
                  
                  var data = snap.val();
                  if((data.url != '') && (data.type == 'voice') && (data.userId != firebase.auth().currentUser.uid)){
                    console.log('room audio filtering for adding to queue...')
                    var mpAvatar = '';
                    self._channelUsersList.forEach(function(singleUser){
                      if(singleUser.id == data.userId){
                        mpAvatar = singleUser.data.avatar;
                      }
                    })
                    self.audioQueue.push({userId: data.userId,avatar: mpAvatar,url: data.url});
                    console.log('self.audioQueue',self.audioQueue);
                    console.log('self.audioQueuePlaying', self.audioQueuePlaying);
                    if(!self.audioQueuePlaying)
                    self.playAudiosInQueue();
                  }
                  
                };

                firebase.database().ref('/messages/'+roomId).limitToLast(10).on('child_changed', callback);

                var callback2 = function(snap) {
                  
                  var data = snap.val();
                  if((data.userId != firebase.auth().currentUser.uid)){
                    var targetEle = $('.active-channel-users').find('#acid'+data.userId);
                    targetEle.find('.iconImage').addClass('notification-status');
                    targetEle.clone().insertBefore(".active-channel-users div.iconItem:first");
                    targetEle.remove();
                    $('.notifcation-btnwrap').find('.notification-deskbtn-counter').show();
                  }

                }

                firebase.database().ref('/messages/'+roomId).orderByChild('timestamp').startAt(Date.now()).on('child_added', callback2);


                }
              }) 
              
            }
    
          });
          
        }
        
      });
    }

    TalkeeIM.prototype.subscribeTooChannelNewRoomAddition =  function(channelId) {
      console.log('subscribeTooChannelNewRoomAddition called');
      var self = this;
      var callback = function(){
        console.log('subscribeTooChannelNewRoomAddition callback');
        self.subscribeTooChannelRoomMsgs(channelId,function(){})
      }
      firebase.database().ref('/channel-rooms/' + channelId).limitToLast(1).on('child_added', callback);
    }

    TalkeeIM.prototype.playAudiosInQueue =  function() {
      var self = this;
      function playSound(){
      if (self.audioQueue.length>0) {
        var audioData = self.audioQueue.shift();
        console.log(audioData);
        var autoplay = (self._currentUser.autoplay)? self._currentUser.autoplay : 'On';
        console.log('autoplay state: ',autoplay)
        if(autoplay == 'On'){
          var volume = (self._currentUser.volume)? self._currentUser.volume : 'On';
          var audioEle = $('body').find('#mainaudio-player');
          audioEle.html('');
          var sound      = document.createElement('audio');
          sound.id       = 'audio-player';
          sound.controls = 'controls';
          sound.src      = audioData.url;
          sound.type     = 'audio/wav';
          sound.autoplay = true;
          sound.preload = "none";
          if(volume == 'Off'){
            sound.volume = 0;
          }
          $('.now_player_icon_avatar').attr('src',audioData.avatar);
          document.getElementById('mainaudio-player').appendChild(sound);
          self.audioQueuePlaying = true;
        

          sound.onplay = function() {
            $('#now_player_icon').show();
          };
          sound.onended = function() {audioPlayFinish('onended')};
          sound.onabort = function() {audioPlayFinish('onabort')};
          sound.onerror = function() {audioPlayFinish('onerror')};
          sound.onsuspend = function() {
            audioPlayFinish('onsuspend')
          };

          
          function audioPlayFinish(callFrom) {
            console.log('On '+callFrom+' called');
            if(callFrom != 'onsuspend')
            $('#now_player_icon').hide();
            self.audioQueuePlaying = false;
            playSound()
          };
        }
      }
      }
      playSound();
      
    }
    TalkeeIM.prototype.deleteTheChannel =  function(channelId,cb) {
      // remove channel data
      firebase.database().ref('/channels/'+channelId).remove();
      // remove all room ids from channel-rooms  channel
      firebase.database().ref('/channel-rooms/'+channelId).remove();
      // remove channel users 
      firebase.database().ref('/channel-users/channels/' + channelId).remove();      
    }  
    TalkeeIM.prototype.ondeleteTheChannel =  function(channelId,cb) {
      var self = this;
      var isTracked = _.contains(self.deleteChannelTrackers,channelId);
      if(!isTracked){
        firebase.database().ref('/channels/'+channelId).on('child_removed', function(oldChildSnapshot) {
          console.log(channelId+' removed ...');
          if(self._currentChannel == channelId){
            $('.backtomainportal').trigger('click');
          }
        });
      }
    }

    TalkeeIM.prototype.DeletePortal =  function(portalId,cb) {
      var self = this;
      // current user is the admin/created the portal 
      self.getPortalDetails(portalId,function(data){
        if(data.createdBy == firebase.auth().currentUser.uid){
            // delete portal channels users
            self.getChannelsListOnPortal(portalId,function(allChannels){  
              allChannels.forEach(channelId => {
                firebase.database().ref('/channel-rooms/' + channelId).once('value', function(snapshot) {
                  var data = snapshot.val();
                  if(data != null){
                    snapshot.forEach(function(childSnapshot) {
                      var roomId = childSnapshot.key;
                      // room messages remove
                      firebase.database().ref('/messages/'+roomId).remove();
                      // room remove remove all rooms of channels by loop
                      firebase.database().ref('/rooms/'+roomId).remove();
              
                    });
                    
                  }
                  // remove all room ids from channel-rooms  channel
                  firebase.database().ref('/channels/'+channelId).remove();
                  // remove all room ids from channel-rooms  channel
                  firebase.database().ref('/channel-rooms/'+channelId).remove();
                  // remove channel users 
                  firebase.database().ref('/channel-users/channels/' + channelId).remove();
                });
              });


              // remove portal channels 
              firebase.database().ref('/portal-channels/'+portalId).remove();
              
            });

            firebase.database().ref('/portal-users/portals/' + portalId).once('value', function(snapshot) {
              var data = snapshot.val();
              if(data != null){
                snapshot.forEach(function(childSnapshot) {
                  var userId = childSnapshot.key; // portal user
                  console.log('ondeluserpor: ',userId);
          
                  // remove users this portal channels list
                  firebase.database().ref('/channel-users/users/'+userId+'/'+portalId).remove();
          
                  // remove users portal ref 
                  firebase.database().ref('/portal-users/users/'+userId+'/'+portalId).remove();
          
                  firebase.database().ref('/users/' + userId+'/activePortalId').set('').then(function(){
                    
                  }).catch(function(error) {
                    console.error('Error writing new message to Firebase Database', error);      //    
                  });


                });
                
              }
              // remove portal users 
              firebase.database().ref('/portal-users/portals/'+portalId).remove();
              // remove main portal information 
              firebase.database().ref('/portals/'+portalId).remove();
          });
            

            
        }
        else{
          console.log('Access denied');
        }
      })
      
    }

    TalkeeIM.prototype.onDeletePortal =  function() {
      var self = this;
      console.log('portal deleting check started');
      firebase.database().ref('portals/').on('child_removed', function(oldChildSnapshot) {
        console.log('some portal deleted: '+ oldChildSnapshot.key + '   '+self._currentPortal )
        if(oldChildSnapshot.key == self._currentPortal){
          self.showNotifcation('Current portal deleted',function(){});
          $('.page').hide();
          $('#regsteps, #page-portal_select').show(0,function(){
            $('#page-portal_select').find('#join-portal-button').removeAttr('disabled')
          });
        }
        
      });
    }

    TalkeeIM.prototype.isAdminOfPortal =  function(portalId,cb) {
      var self = this;
      
      self.getPortalDetails(portalId,function(data){
        if(data.createdBy == firebase.auth().currentUser.uid){
          cb(true);
        }
        else{
          cb(false);
        }
      })
    }
    

    TalkeeIM.prototype.leaveTheChannel =  function(userId,channelId,cb) {
      var self = this;
      if(self._currentChannel == ''){
        cb(false);
        return;
      }
      
      var portalId = self._currentPortal;

      self.getChannelDetails(channelId,function(channelData){
        // if(channelData.createdBy == userId){
        //   cb(true); // normally leave 
        // }
        //else{
          firebase.database().ref('/channel-users/channels/'+channelId+'/'+userId).remove().then(function(){
            self._currentChannel = '';
              cb(true)
            /* firebase.database().ref('/channel-users/users/'+userId+'/'+portalId+'/'+channelId).remove().then(function(){
              self._currentChannel = '';
              cb(true)
            }).catch(function(error) {
              console.error('Error writing Firebase Database', error); 
              cb(false)
            }); */
          }).catch(function(error) {
            console.error('Error writing Firebase Database', error); 
            cb(false)
          });
        //}
      })
            
    }

    
    TalkeeIM.prototype.onMaindDashboardShown =  function() {
      var self = this;
      var userId = self._currentUserId;
      if(self._currentChannel == ''){
        $('.searchChannelOrUsers input').attr('data-search','channel');
        $('.searchChannelOrUsers input').attr('placeholder','');  //Search Channels
      }
      else{
        $('.searchChannelOrUsers input').attr('data-search','users');
        $('.searchChannelOrUsers input').attr('placeholder','');//Search Users
      }
      $('.header-settings').hide();
      $('.header-desktop2').show();
      $('.searchChannelOrUsers').show();
      $('#active-portal-channels').html('');
      $('#active-portal-channels').show();
      // $('.record-trigger').hide();
      $('.backbutton').hide();
      $('.header-exploreportal').hide();
      $('.header-createchannel').hide();
      self._activeChatRoomId = '';
      self._activeChatRoomReceiver = '';
      $('.page-container2').removeClass('margtopzero');
      
    }
    TalkeeIM.prototype.showNotifcation =  function(desc,cb) {
      // alert(desc);
      var self = this;
      var notification = (self._currentUser.notification)? self._currentUser.notification: 'On';
      if(notification == 'On'){
          toastr.info(desc)
      }
      cb();
    }
    TalkeeIM.prototype.notifyUser =  function(desc) {      
      toastr.info(desc);
    }
    TalkeeIM.prototype.addUsersNotifcation =  function(users,desc) {
      var self = this;
      users.forEach(userId => {
        firebase.database().ref('/notifications/'+userId).push(desc).then(function(messageRef) {      

        }).catch(function(error) {
          console.error('There was an error uploading a file to Cloud Storage:', error);
        });
      });
    }

    TalkeeIM.prototype.createAudioPlayer =  function(element) {
      var self = this;
      console.log(element)
      /* element = element || null;
      if(element == null)
        return; */
      //var audios = document.getElementsByClassName("audioele");
      // audiojs initialize
      audiojs.events.ready(function() {
        var a3 = audiojs.create(element, {
          createPlayer: {
            markup: '\
              <div class="play-pause"> \
                <p class="play"><i class="fa fa-play"></i></p> \
                <p class="pause"><i class="fa fa-pause"></i></p> \
                <p class="loading"><i class="fa fa-circle-o-notch fa-spin"></i></p> \
                <p class="error"><i class="fa fa-warning"></i></p> \
              </div> \
              <div class="scrubber"> \
                <div class="progress"></div> \
                <div class="loaded"></div> \
              </div> \
              <div class="time"> \
                <em class="played">00:00</em>\<strong class="duration">00:00</strong>\
              </div> \
              <div class="error-message"></div>',
            playPauseClass: 'play-pause',
            scrubberClass: 'scrubber',
            progressClass: 'progress',
            loaderClass: 'loaded',
            timeClass: 'time',
            durationClass: 'duration',
            playedClass: 'played',
            errorMessageClass: 'error-message',
            playingClass: 'playing',
            loadingClass: 'loading',
            errorClass: 'error'
          }
        });      
      });

    }
    TalkeeIM.prototype.protectPortalByPassword = function(pass,portalId,cb) {  
      var self = this; 
      var data = {};
      data.msg = 'You are not authorized to do this action.';
      data.error = true;
      self.isAdminOfPortal(portalId,function(result){
        if(result){
          console.log('admin changing pass');
          // hash password now and set to db
          
          var salt = bcrypt.genSaltSync(10);
          var hash = bcrypt.hashSync(pass, salt);
          
          // check 
          // var passMatch = bcrypt.compareSync('4545', hash); // true
          // console.log('passmatch', passMatch);
          // Store hash in your password DB.
          self.updatePassOfPortal(portalId,hash,function(){
            data.msg = 'Password saved successfully. Your portal is protected.';
            data.error = false;
            cb(data);
          });          
        }
        else{
          cb(data);
        }
      })
    }

    TalkeeIM.prototype.isPortalPassMatched = function(portalId,pass,cb) {  
      var self = this;          
      self.getPortalDetails(portalId,function(data){
        var passMatch = bcrypt.compareSync(pass, data.password);
        cb(passMatch);
      });
    }

    TalkeeIM.prototype.moveUserToPortalDashboard = function(portalId) {  
      var self = this;
      $('.page').hide();
      self.setActivePortal(portalId,function(){
        self._currentPortal = portalId;
        firebase.database().ref('/users/' + firebase.auth().currentUser.uid).once('value', function(snapshot) {
          var data = snapshot.val();
          if(data != null){
            if(data.onPage == 5){
              self.showActivePortalDashboard(data,self._currentPortal);
              // self.onDeletePortal();
            }
            else if((data.onPage == 4) || (data.onPage == 3) || (data.onPage == 2)){
              self.updateOnPage(5);
              self.showActivePortalDashboard(data,self._currentPortal);
            }
            else{
              console.log('end up here on page: ',data.onPage)
              console.log('self._currentPortal',self._currentPortal);
            }
          }
        });
        
      });    
    }
    TalkeeIM.prototype.allowToJoinOrCreatePortal = function(type,textOrId) {
      var self = this;
      self.createOrJoinPortal(type,textOrId,function(data){
        // console.log(data);
        if(data.error == true){
          // location.reload();
          self.notifyUser('Error occured, contact site administrator.');
        }
        else{        
          // move user to portal dashboard 
          self.moveUserToPortalDashboard(data.portalId);
        }
      })
    }

    TalkeeIM.prototype.trackWantToJoinPortal = function() {
      var self = this;
      // save coming url if they have any portal name
      var crntParsedUrl = parseUrl(window.location.href);
      console.log('crntParsedUrl',crntParsedUrl)
      var pathName = crntParsedUrl.pathname;
      var pathQuery = crntParsedUrl.query;
      pathName = pathName.replace('/','');
      var paths = pathName.split("/");
      console.log('paths',paths);        
      var wantToEnterPortal = '';
      var joinId = '';

      var portalOnSignup = '';
      
      if(pathQuery.join != undefined){
        joinId = pathQuery.join;
      }
      if(pathQuery.portal != undefined){
        portalOnSignup = pathQuery.portal;
      }
      if(crntParsedUrl.resource == "localhost"){
        wantToEnterPortal = paths[2];
      }
      else{
        wantToEnterPortal = paths[1];
      }
      if(wantToEnterPortal == 'signup'){
        var modifyRegForm = {
          portal: portalOnSignup,
          joinId: joinId
        }
        self.readyRegSignForm('signup',modifyRegForm);   
        wantToEnterPortal = portalOnSignup;     
      }
      if(wantToEnterPortal == 'signin'){
        self.readyRegSignForm('signin');     
        wantToEnterPortal = '';   
      }
      console.log('wantToEnterPortal',wantToEnterPortal);
      console.log('wantToEnterPortalWithjoinid',joinId);
      // save in browser localStorage 
      localStorage.setItem("wantToEnterPortal", wantToEnterPortal);
      localStorage.setItem("wantToEnterPortalWithjoinid", joinId);
      // var lastname = localStorage.getItem("key");
      // localStorage.removeItem("key");
    }

    TalkeeIM.prototype.resetTrackedPortal = function() {
      if (localStorage.wantToEnterPortal) {
        localStorage.removeItem("wantToEnterPortal");
      }
      if (localStorage.wantToEnterPortalWithjoinid) {
        localStorage.removeItem("wantToEnterPortalWithjoinid");
      }
    }

    TalkeeIM.prototype.getTrackedPortal = function() {
      var data = {
        trackedPortalPath: '',
        joinId: ''
      };
      if (localStorage.wantToEnterPortal) {
        data.trackedPortalPath = localStorage.getItem("wantToEnterPortal");
      }
      if (localStorage.wantToEnterPortalWithjoinid) {
        data.joinId = localStorage.getItem("wantToEnterPortalWithjoinid");
      }
      return data;
    }

    TalkeeIM.prototype.isOnMobile = function() {

      // device detection
      if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
      || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) { 
          return true;
      }
      else {
        return false;
      }
    }

    TalkeeIM.prototype.readyRegSignForm = function(state,modify) {
      var self = this;
      var modify = (modify == undefined)? null: modify;
      $('.regsigninfromwrap').find('#formregs-name').attr('autocomplete','off');
      $('.regsigninfromwrap').find('#formregs-surname').attr('autocomplete','off');
      $('.regsigninfromwrap').find('#formregs-email').attr('autocomplete','off');
      $('.regsigninfromwrap').find('#password2').attr('autocomplete','off');
      $('.regsigninfromwrap').find("input[type=text],input[type=email],input[type=password], textarea").val("");
          if(state == 'signup'){
            var regsignTexts = {
              title: 'Register with your email or Google account',
              button: 'Create Account',
              gtitle: 'Or Sign up with Google',
              gButton: 'Google Sign up',
              linkText: 'Sign in'
            }

            $('.regsigninfromwrap').find('.namegroup').show();
            $('.regsigninfromwrap').find('#formregs-name').attr('required','required');
            
            $('.regsigninfromwrap').find('#formregs-surname').attr('required','required');            

            $('.regsigninfromwrap').find('form:first').attr('data-state', 'signup');
            $('.regsigninfromwrap').find('#formregs-name').focus();
            var emailInput = $('.regsigninfromwrap').find('#formregs-email');
            
            // modify signup form for join request
            console.log('modify test',modify);
            if(modify != null){
              if((modify.portal != '') && (modify.joinId != '')){
                // test portal and joinid are valid
                emailInput.parent().hide();
                regsignTexts.title = 'Please complete sign up to enter the portal';
                $('.regsigninfromwrap').find('.social-login-content').hide();
                console.log('calling getPortalByUrl');
                self.getPortalByUrl(modify.portal,function(portalData){
                  console.log(portalData);
                  if(portalData.id != null){
                    if(modify.joinId != ''){
                      // verify joinid for the portal
                      
                      self.getJoinDetails(portalData.id,modify.joinId,function(result){
                        console.log('verifyJoinLink ',result)
                        if(result != false){
                          console.log('came here vjl true');
                          // hide email input and set val of email to there
                          console.log(modify.joinId,'related',result.email)
                          //var emailInput = $('.regsigninfromwrap').find('#formregs-email');
                          emailInput.parent().hide();
                          emailInput.val(result.email);
                          emailInput.removeAttr('required');
                        }
                        else{
                          emailInput.parent().show();
                          regsignTexts.title = 'Register with your email or Google account';
                          $('.regsigninfromwrap').find('.social-login-content').show();
                        }
                      });
                    }
                    else{
                      emailInput.parent().show();
                      regsignTexts.title = 'Register with your email or Google account';
                          $('.regsigninfromwrap').find('.social-login-content').show();
                    }
                  }
                  else{
                    emailInput.parent().show();
                    regsignTexts.title = 'Register with your email or Google account';
                          $('.regsigninfromwrap').find('.social-login-content').show();
                  }
                })

              }
            }
          }
          else{
            var regsignTexts = {
              title: 'Sign in with your email or Google account',
              button: 'Sign in',
              gtitle: 'Or Sign in with Google',
              gButton: 'Google Sign in',
              linkText: 'Sign up'
            }
            $('.regsigninfromwrap').find('.namegroup').hide();
            $('.regsigninfromwrap').find('#formregs-name').removeAttr('required');
            $('.regsigninfromwrap').find('#formregs-surname').removeAttr('required');
            $('.regsigninfromwrap').find('form:first').attr('data-state', 'signin');
            
            $('.regsigninfromwrap').find('#formregs-email').show();
            $('.regsigninfromwrap').find('#formregs-email').focus();
            console.log('focus called')
          }
          $('.regsigninfromwrap').find('.title').text(regsignTexts.title);
          $('.regsigninfromwrap').find('.regsignbtn').text(regsignTexts.button);
          $('.regsigninfromwrap').find('.gtitle').text(regsignTexts.gtitle);
          $('.regsigninfromwrap').find('.gregsignbtn').text(regsignTexts.gButton);
          $('.regsigninfromwrap').find('#regsigninlink').text(regsignTexts.linkText);
    }

    TalkeeIM.prototype.getExistingLink = function(portalId,email,cb){
      var self = this;
      firebase.database().ref('/invite/' + portalId).orderByChild('email').equalTo(email).once('value', function(snapshot) {
        console.log(snapshot.val());
        var data = null;
        if(snapshot.val() != null){
          
          snapshot.forEach(function(childSnapshot) {
            var savedLink = childSnapshot.val();
            if(savedLink.email == email){
              data = childSnapshot.key;
            }           
          });      
        }    
         
        cb(data);
      }).catch(function(error) {
        console.error('Error reading data to Firebase Database', error);
        
      });
    }

    TalkeeIM.prototype.deleteJoinLink = function(portalId,joinid){
      var self = this;
      firebase.database().ref('/invite/' + portalId+'/'+joinid).remove().then(function() {

      }).catch(function(error) {
        console.error('Error reading data to Firebase Database', error);
      });
    }

    TalkeeIM.prototype.getJoinDetails = function(portalId,joinid,cb){
      var self = this;
      firebase.database().ref('/invite/' + portalId+'/'+joinid)
      .once('value', function(snapshot) {
        var data = false;
        var savedLink = snapshot.val();
        if(savedLink != null){
          data = savedLink;    
        }           
        cb(data);
      })
      .catch(function(error) {
        console.error('Error reading data to Firebase Database', error);
        var data = false;
        cb(data);
      });
    }

    TalkeeIM.prototype.verifyJoinLink = function(portalId,joinid,email,cb){
      var self = this;
      firebase.database().ref('/invite/' + portalId+'/'+joinid).once('value', function(snapshot) {
        console.log(snapshot.val());
        var data = false;
        var savedLink = snapshot.val();
        if(savedLink != null){
          console.log(savedLink.email,email);
          if(savedLink.email == email){
            data = true;
          }          
        }           
        cb(data);
      }).catch(function(error) {
        console.error('Error reading data to Firebase Database', error);
        cb(false);
      });
    }

    TalkeeIM.prototype.createInviteLink = function(portalId,email,cb){
      var self = this;
      console.log(portalId,email);
      self.getExistingLink(portalId,email,function(result){
        if(result == null){
        var data = {
          email: email,
          createdBy: firebase.auth().currentUser.uid,
          createdAt: Date.now(),
        };
        firebase.database().ref('/invite/'+portalId).push(data).then(function(res){
          // res.key
          // open modal
          // link
          var link= {
            error: false,
            id: res.key
          };
          cb(link);
          
        }).catch(function(error) {
          console.error('Error writing new data to Firebase Database', error);
          var resutlt= {
            error: true
          };
          cb(resutlt);
        });

        }
        else{
          var link= {
            error: false,
            id: result
          };
          cb(link);
        }
      });
      
    }

    TalkeeIM.prototype.isAlredyRegistered = function(email,cb) {
      firebase.auth().fetchSignInMethodsForEmail(email).then(function(data){
        if(data.length>0){
          cb(true)
        }
        else{
          cb(false)
        }
      })
      .catch(function(error) {
        cb(false)
      });
    }
    
    // event handlers
    TalkeeIM.prototype.attachEventHandlers = function() {
        var self = this;
        toastr.options = {
          "closeButton": false,
          "debug": false,
          "newestOnTop": true,
          "progressBar": false,
          "positionClass": "toast-top-right",
          "preventDuplicates": false,
          "onclick": null,
          "showDuration": "100",
          "hideDuration": "300",
          "timeOut": "2000",
          "extendedTimeOut": "1000",
          "showEasing": "swing",
          "hideEasing": "linear",
          "showMethod": "fadeIn",
          "hideMethod": "fadeOut"
        }
        
        self.isMobile = self.isOnMobile();
        
        // on startup
        
        /* $( document ).ready(function() {
          setTimeout(() => {
            
          }, 50);
        }); */

        var autopState = (self.isMobile)? 'Off' : 'On';
        self.updateAutoplay(autopState,function(){
        });
        $('.autoplay-button').attr('data-autoplay',autopState);
        // $('.autoplay-button').find('.fa').addClass('dim-btn');

        
        

        $('.addPeopleServicesPage, .header-addps').hide();
        $('.header-settings').hide();
        $('.dashboardPage').hide();
        $('.backbutton').hide();
        $('.header-chatui').hide();
        $('.header-exploreportal').hide();
        $('.header-createchannel').hide();
        
        var deskMarg = 80;   
        
        if(self.isMobile){
          deskMarg = 0;
        }
        $('.page-container2').height($(window).height()-($('.header-desktop2').height()+deskMarg));
        $('.mainDashboardContainer').show(0,self.onMaindDashboardShown());
        $('#page-portal_select, #page-login, .page, .searchChannelOrUsers').hide();

        // $('.record-trigger').hide();
        $('.channel-leave-btn, .channel-delete-btn').hide();
        $('#now_player_icon').hide();
        $('.requestshandleUItrigger').hide();
        // var breakPointForSmallerDashBoard = 1350+40;
        var breakPointForSmallerDashBoard = 1350;
        if($(window).width()>=breakPointForSmallerDashBoard){
          $('#page-dahsboard').addClass('smallerDashboard');
          $('.smallerDashboard').height($(window).height()-80);

        }
        $('.au-chat__content_only_recordtrigger').height($(window).height()-90);
        // chatbox height fix
        var heights = 154+90+30;
        // var minusHeights = $('.header-desktop2').height()+$('.au-chat-textfield').height()+$('.au-chat__title').height();
        // console.log('minusHeights',minusHeights);
        //console.log($('.au-chat__title').height(),$('.header-desktop2').height(),$('.au-chat-textfield').height(),$(window).height());        
        $('.au-chat__content').height($(window).height()-(60+heights+deskMarg));
        //  self.isMobile = true;
        var mobilebottom = (self.isMobile)? 115: 0;
        var mainConHeight = ($(window).height())-(75+mobilebottom);
        $('.mainDashboardContainer  .mainroundsholder').height(mainConHeight);
        
        // even space for seperator in desktop for menu sidebar 
        var evenSpace = ($(window).height())-(473+80);
        evenSpace = (evenSpace>0)? (evenSpace/2) : 0;
        var firstSpace = (evenSpace>0)? (evenSpace/2) : 0;
        $('.menu-sidebar2-seperator:first').height(firstSpace);
        $('.menu-sidebar2-seperator:last').height(evenSpace);

        

        $(document).on('click', '#sign-out', function(event){
          // resetactiveportal resetting activeportal and activechannel of user
          
            var cid = self._currentChannel;
            var userId = firebase.auth().currentUser.uid;
            var currentUser = self._currentUser;
            
        
            self.updateUserStatus('Offline',function(){
              
              self.leaveTheChannel(userId,cid,function(result){
                self.getChannelUsers(cid,function(members){
                
                  self.getChannelDetails(cid,function(channelData){
                    if(members.length>0){
                      var notiMsg = currentUser.name+' left the channel " '+channelData.name+'"';
                      self.addUsersNotifcation(members,notiMsg);
                    }

                    self.resetActivePortal(function(){
                      self._currentPortal = '';
                      self._currentChannel = '';
                      $('.activeChannelName').html('');
                      $('.active-channel-users').html('');
                      $('.activeChannelName').html('Lobby');
                      $('.channel-leave-btn').hide();
                      self.readyRegSignForm('signin');
                      self.signOut();

                      console.log('sign out ')
                    })
                  });                
                          
              })
              
              });
            });
        
          
          
        });

        $(document).on('click', '#sign-in-withgoogle', function(event){
            self.signIn();           
        });

        $(document).on('submit', '#join-or-create-portal', function(event){
          event.preventDefault();
          var crntFormEle = $(this);
          var portalText = $(this).find('#createportaltext').val();
          var portalSelected = '';
          if(portalText == ''){
            portalSelected = $('.portallist-holder tr[data-selected="1"]').attr('data-portal-id');
            console.log('portalSelected',portalSelected);
          }
          if((portalText == '') && (portalSelected == undefined)){
            self.showNotifcation('Please enter a portal name or select a portal',function(){});
          }
          else{
            var type = '';
            var textOrId = '';   
            if((portalText != '')){
              type = 'create';
              textOrId = portalText;
            }
            else if(portalSelected != undefined){
              type = 'join';
              textOrId = portalSelected;
            }
            console.log(type,textOrId);
            // reset ui 
            $(this).find('#createportaltext').val('');
            var allEles =  $(this).find('.portallist-holder').find('tr');
            allEles.find('td:last').hide();
            allEles.attr('data-selected',0);
            $(this).find('#join-portal-button').attr('disabled','disabled');
            if(type == 'join'){
              self.getPortalDetails(textOrId,function(data){
                if(data != null){
                  if(data.password != ''){
                    console.log('came here 3212');
                    var passform = crntFormEle.parents('.container:first').find('#join-or-create-portal-pass');
                    passform.attr('data-type',type);
                    passform.attr('data-textOrId',textOrId);
                    passform.find('.title1:first').text('Protected Portal');
                    passform.find('.title2:first').text('Enter password to join portal');
                    passform.find('#back-button:first').text('BACK');
                    passform.find('#join-button:first').text('JOIN');
                    passform.show();
                    crntFormEle.hide();                    
                  }
                  else{
                    console.log('came here 2');
                    // allow to join or create
                    self.allowToJoinOrCreatePortal(type,textOrId);
                  }
                }
              });
            }
            else{
              // allow to set pass on create
              self.createOrJoinPortal(type,textOrId,function(data){
                if(data.error == false){
                  console.log('showing pass form for created portal');
                  var passform = crntFormEle.parents('.container:first').find('#join-or-create-portal-pass');
                  passform.attr('data-type',type);
                  passform.attr('data-textOrId',data.portalId);
                  passform.find('.title1:first').text('Lock your portal');
                  passform.find('.title2:first').text('Enter password to lock portal');
                  passform.find('#back-button:first').text('SKIP');
                  passform.find('#join-button:first').text('ADD PASSWORD');
                  passform.show();
                  crntFormEle.hide();         
                }
                
              });
              
              // self.allowToJoinOrCreatePortal(type,textOrId);
            }
          }
          
        }); 

        $(document).on('submit', '#join-or-create-portal-pass', function(event){
          event.preventDefault();
          var crntFormEle = $(this);
          var type = crntFormEle.attr('data-type');
          var textOrId = crntFormEle.attr('data-textOrId');
          var portalPass = $(this).find('#portaljoinpassinput:first').val();
          if(type == 'join'){
            self.isPortalPassMatched(textOrId,portalPass,function(result){
              if(result){  
                self.allowToJoinOrCreatePortal(type,textOrId);
              }
              else{              
                self.notifyUser('Password not matched, Please enter a valid password');
              }
            });
          }
          else{
            // on create portal pass screen submit
            console.log('#join-or-create-portal-pass ',type,textOrId);
            var pass = portalPass;
            if((pass != '') && (pass.length>7)){            
              self.protectPortalByPassword(pass,textOrId,function(result){
                if(result.error == false){
                  self.notifyUser(result.msg);
                  self.moveUserToPortalDashboard(textOrId);
                }
                else{
                  self.notifyUser(result.msg);
                }
              });
              $(this).find('#portaljoinpassinput').val('');
            }
            else{
              self.notifyUser('Password should be at leaset 8 characters in length.');
            }
          }
        });
        $(document).on('click', '#back-portal-onsignin-button-pass', function(event){
          console.log('1111111');
          var crntFormEle = $(this);
          
          var mainForm = crntFormEle.parents('.container:first').find('#join-or-create-portal');
          var passForm = crntFormEle.parents('.container:first').find('#join-or-create-portal-pass');
          var type = passForm.attr('data-type');
          var textOrId = passForm.attr('data-textOrId');
          console.log('back-portal-onsignin-button-pass ',type,textOrId);
          if(type == 'join'){
            mainForm.show();
            passForm.hide();          
            console.log('2222222');
          }
          else{
            // on pass screen skipping move user to portal dashboard 
            self.moveUserToPortalDashboard(textOrId);
          }
        });

        $(document).on('click', '.portallist-holder tr', function(event){
          var selected = ($(this).attr('data-selected') == '1')? 0 : 1;    
          var allEles = $(this).parents('.portallist-holder').find('tr');
          allEles.find('td:last').hide();
          allEles.attr('data-selected',0);
          
          
          console.log('selected', selected)       
        
          if(selected == 1){
            $(this).find('td:last').show();
            $(this).attr('data-selected',1);
          }
          else{
            $(this).find('td:last').hide();
            $(this).attr('data-selected',0);
          }
        
        });

        $(document).on('click', '.backtoportal', function(event){
          $('.page').hide();
          $('#page-portal_select').show(0,function(){
            $('#page-portal_select').find('#join-portal-button').removeAttr('disabled')
          });
        });

        $(document).on('click', '.nexttoavatar', function(event){
          $('.page').hide();
          //$('#page-enteravatar').show();
          // var name = $('.usernametakeinput').val();
          // self.updateUserName(name);
          //self.updateOnPage(4);
          self.updateOnPageWithCb(5,function(){
            self.moveUserToPortalDashboard(self._currentPortal);              
          });
        });

        $(document).on('click', '.nextodashboard', function(event){
          $('.page').hide();
          self.getUser(function(data){
            console.log(data);
            var avatarSet = (data.avatar)? true: false;
            if(!avatarSet){
              data.avatar = 'images/icon/avatar1.jpg'
              self.updateAvatarUrl(data.avatar);
              console.log('avatar change called');
            }
            $('.cuserAvatar').attr('src',data.avatar);
            $('.settingsUsername').html(data.name);
            $('.settingsUserstatus').html(data.status);
            
            /* $('#page-dahsboard').show(0,function(){
              $('#regsteps').hide();
            }); */
            self.updateOnPageWithCb(5,function(){
              self.moveUserToPortalDashboard(self._currentPortal);              
            });
          })
          
          
        });

        $(document).on('click', '.backtoentername', function(event){
          $('.page').hide();
          $('#page-enterusername').show(0,function(){
            $('.usernametakeinput').focus()
          });
        });
        $(document).on('keyup', '#createportaltext', function(event){
          $('.portal-list-wrapper').removeClass('bordergreen2');
          $('.createportaltext').addClass('bordergreen2');
          $(this).parents('form:first').find('#join-button').text('CREATE');
        });
        $(document).on('keyup', '#portal-search', function(event){
          event.preventDefault();
          $('.portal-list-wrapper').addClass('bordergreen2');
          $('.createportaltext').removeClass('bordergreen2');
          $(this).parents('form:first').find('#join-button').text('JOIN');
          var searchText = $(this).val();
          var container = $(this).parents('.portal-list-wrapper').find('#searched-portal-list');
          if(searchText != undefined){
              setTimeout(function() {
                self.showSimilarPortals(searchText,function(portals){
                  container.html('');
                  portals.forEach(function(snapVal) {
                    //portals.push({id: childSnapshot.key, name: snapVal.name});
                    var tpl = `
                      <tr data-portal-id="`+snapVal.key+`" data-selected="0">
                        <td>`+snapVal.name+`</td>
                        <td style="display: none"><i class="fa fa-check-circle"></i></td>
                      </tr>
                    `;
                    container.append(tpl);      
                  });
                });   
              }, 200);
          }
        });

        $(document).on('keyup', '#showotherchannelsonportal', function(event){
          event.preventDefault();
          var searchText = $(this).val();
          var containerMy = $(this).parents('.enterChannelPage').find('.portalchannelsholder');
          var containerOther = $(this).parents('.enterChannelPage').find('.otheruserschannelonportal');
          containerMy.html('');
          containerOther.html('');
          if(searchText != undefined){
              setTimeout(function() {
                self.searchChannelsOnPortals(searchText,self._currentPortal,function(foundChannels){
                  console.log(foundChannels);
                  self.getMyChannelsOnPortal(self._currentPortal,function(myChannels){
                    containerMy.html('');
                    containerOther.html('');
                    foundChannels.forEach(function(channel) {
                    
                      if(myChannels.includes(channel.cId)){
                        var tpl = `
                      <div class="iconItem activeTheChannel icon-item-yellow" data-id="`+channel.cId+`" style="">
                      <span class="image iconImage img-cir img-70 cursorPointer centerIconWrap" style=""></span>
                      <span class="iconName" style="">`+channel.cData.name+`</span>                        
                      </div>
                      `;
                      containerMy.append(tpl);      
                      }
                      else{
                        // otehrs channel
                        var tpl = `
                        <div class="iconItem reqtojoinchannel icon-item-yellow" data-id="`+channel.cId+`" style="">
                        <span class="image iconImage img-cir img-70 cursorPointer centerIconWrap" style=""></span>
                        <span class="iconName" style="">`+channel.cData.name+`</span>                        
                        </div>
                        `;
                        containerOther.append(tpl);      
                      }
                    });
                  });
                  
                });    
              }, 200);
          }
        });

        $(document).on('click', '#uploadAvatarTrigger', function(event){
          event.preventDefault();
          $('#avatarCapture').trigger('click');
        });

        $(document).on('change', '#avatarCapture', function(event){
          //event.preventDefault();
          self.onMediaFileSelected();
        });

        $(document).on('click', '.sampleAvatarset', function(event){
          var url = $(this).find('img').attr('src');
          self.updateAvatarUrl(url);
        });

        $(document).on('click', '.blankAvatarset', function(event){
          var url = 'images/icon/blank.jpeg';
          self.updateAvatarUrl(url);
        });

        $(document).on('click', '.toggleSettings', function(event){
          $('.addPeopleServicesPage, .header-addps').hide();
          $('.dashboardPage').hide();
          $('.header-desktop2').hide();
          $('.header-settings').show();
          $('.settingsPage').toggle();
          //$('.record-trigger').hide();
          self.isAdminOfPortal(self._currentPortal, function(isAdmin){
            if(isAdmin){
              $('#deletePortal').show();
              $('.lockportalbox').show();
            }
            else{
              $('#deletePortal').hide();
              $('.lockportalbox').hide();
            }
          })
        });

        $(document).on('click', '.createChannel', function(event){
          $('.dashboardPage').hide();
          $('.createChannelPage').toggle();
          if(self.isMobile){
            $('.header-createchannel').show();
            $('.header-exploreportal').hide();
            $('.header-desktop2').hide();
            $('.page-container2').addClass('margtopzero');
          }
        });

        $(document).on('click', '.showmaindashboard', function(event){
          $('.dashboardPage').hide();
          $('.addPeopleServicesPage, .header-addps').hide();
          $('.mainDashboardContainer').show(0,self.onMaindDashboardShown());
        });

        $(document).on('click', '.exploreChannels', function(event){
          $('.searchChannelOrUsers input').attr('data-search','channel');
          $('.searchChannelOrUsers input').attr('placeholder','');//Search Channels  
          $('.showotherchannelsonportal').val('');
          $('.dashboardPage').hide();
          $('.enterChannelPage .portalchannelsholder').html('');
          $('.enterChannelPage .otheruserschannelonportal').html('');
          $('.backbutton').show();
          if(self.isMobile){
            $('.header-exploreportal').show();
            $('.header-desktop2').hide();
            $('.page-container2').addClass('margtopzero');
          }

            var portalId = self._currentPortal;
            self._exploreChannelList = new Array();
            self.getChannelsListOnPortal(portalId,function(allChannels){  
              allChannels.forEach(channelId => {
                
                  self.getChannelDetails(channelId,function(channelData){
                    if(channelData != undefined){
                    self._exploreChannelList.push({cId: channelId, cData: channelData});                      
      
                    $('.enterChannelPage .otheruserschannelonportal').append(`<div class="iconItem reqtojoinchannel " data-id="`+channelId+`" style="">
                    <span class="image iconImage   cursorPointer centerIconWrap" style=""><img src="images/Channel1.png" class="icon-large"></span>
                    <span class="iconName" style="">`+channelData.name+`</span>                        
                    </div>`);
      
                    }
      
                  }); 
                
              });
              /* self.getMyChannelsOnPortal(portalId,function(myChannels){
                myChannels.forEach(channelId => {
                  self.getChannelDetails(channelId,function(channelData){
                    if(channelData != undefined){
                    self._exploreChannelList.push({cId: channelId, cData: channelData});
                    $('.enterChannelPage .portalchannelsholder').append(`<div class="iconItem activeTheChannel icon-item-yellow" data-id="`+channelId+`" style="">
                    <span class="image iconImage img-cir img-70 cursorPointer centerIconWrap" style=""></span>
                    <span class="iconName" style="">`+channelData.name+`</span>                        
                    </div>`);
                    }
                  });
                });
                // other channels of users on this portal 
                // console.log('mychannels',myChannels);
                // console.log('allChannels',allChannels);
                
        
              }); */
              
            });
        
          
          
          $('.enterChannelPage').show();
        });

        $(document).on('click', '.activeTheChannel', function(event){
          var cName = $(this).find('.iconName').text();
          self._currentChannel = $(this).attr('data-id');
          self.setActiveChannel(self._currentChannel,function(){
            $('.activeChannelName').html(cName);
            $('.addmultiplethings').attr('data-add','user-to-channel');
            console.log(self._currentChannel);
            $('.dashboardPage').hide();
            $('.mainDashboardContainer').show(0,self.onMaindDashboardShown());
            $('.active-channel-users').html('').show();
            $('#active-portal-channels').hide();
            if(self._currentChannel != ''){
              self.showUsersOfChannel(self._currentChannel);
              $('.searchChannelOrUsers input').attr('data-search','users');
              $('.searchChannelOrUsers input').attr('placeholder','');//Search Users
              $('.channel-leave-btn').show();
              //self.subscribeTooChannelRoomMsgs(self._currentChannel,function(){});
              self.subscribeTooChannelNewRoomAddition(self._currentChannel);
              self.subscribeTooChannelMemberUpdates(self._currentChannel);
            }
          })

          self.getChannelDetails(self._currentChannel,function(channelData){
            if(channelData.createdBy == firebase.auth().currentUser.uid){
              $('.channel-delete-btn').show();
            }
            else{
              $('.channel-delete-btn').hide();
            }
          })

          self.ondeleteTheChannel(self._currentChannel,function(){});
          
        });

        $(document).on('click', '.reqtojoinchannel', function(event){
          var cid = $(this).attr('data-id');
          var container = $(this);
          var liuserId = firebase.auth().currentUser.uid;
          // if user in channel user list
          self.getChannelUsers(cid,function(members){
            var inList = _.contains(members,liuserId);
            if(inList){
              // user in the list direct entry activate the channel page
              // activate/open the channel
              console.log('found in channel user list');
              self.showActiveChannelPage(cid);
              self.removeUserFromOtherChannels(liuserId,cid,function(){});
            }
            else{
              // is user joined previously is true add user in channel user list and notify
              self.getUserJoinedChannelList(liuserId,self._currentPortal,function(joinedChannels){
                inList = _.contains(joinedChannels,cid);
                console.log('found in user channel list ',inList);
                self.getChannelDetails(cid,function(channelData){
                  if(inList || (channelData.createdBy == liuserId)){
                    console.log('found in (channelData.createdBy == liuserId) ',(channelData.createdBy == liuserId));
                    // add user in channel user list 
                    self.addUserToChannelListOnly(liuserId,cid,function(){
                      // notify other users
                      self.getChannelUsers(cid,function(members){              
                        
                          members = _.reject(members, function(d){ return d === liuserId; });                  
                          if(members.length>0){
                            var notiMsg = self._currentUser.name+' joined the channel " '+channelData.name+'"';
                            self.addUsersNotifcation(members,notiMsg);
                          }
                        
                      });     
                      self.showActiveChannelPage(cid);
                    })

                    
                  }
                  else{
                    // this is a new request for user to join the channel, add request for admin
                    self.addNewRequestToChannel(cid,function(){
                      container.remove();
                      self.showNotifcation('Request sent successfully',function(){});
                    });

                  }
                })
              })
            }
          });
          /* self.getChannelDetails(cid,function(channelData){
            if(channelData.createdBy == liuserId){
              // rejoin admin & notify
              self.addUserToChannel(liuserId,cid,function(){
                self.getChannelUsers(cid,function(members){              
                    self.getChannelDetails(cid,function(channelData){
                      members = _.reject(members, function(d){ return d === liuserId; });                  
                      if(members.length>0){
                        var notiMsg = self._currentUser.name+' joined the channel " '+channelData.name+'"';
                        self.addUsersNotifcation(members,notiMsg);
                      }
                    });     
                });     
                // activate/open the channel
                self.showActiveChannelPage(cid);
              });
              
            }
            else{
              self.addNewRequestToChannel(cid,function(){
                container.remove();
                self.showNotifcation('Request sent successfully',function(){});
              });
            }
          }); */
        });

        $(document).on('click', '.backtomainportal', function(event){
          self._currentChannel = '';
          self.resetActiveChannel(function(){
            $('.activeChannelName').html('');
            $('.addmultiplethings').attr('data-add','user-to-portal');
            $('.active-channel-users').html('').hide();
            $('.searchChannelOrUsers input').attr('data-search','channel');
            $('.searchChannelOrUsers input').attr('placeholder','');//Search Channels
            $('.channel-leave-btn, .channel-delete-btn').hide();
            $('.activeChannelName ').html('Lobby');
            $('.dashboardPage').hide();
            $('.mainDashboardContainer').show(0,self.onMaindDashboardShown());
          })
          
        });

        $(document).on('click', '.addmultiplethings', function(event){  
          var whatToAdd = $(this).attr('data-add');
          // if(whatToAdd == 'user-to-channel'){
            $('.dashboardPage, .header-desktop2, .header-settings').hide();
            // 
            $('.addPeopleServicesPage, .header-addps').show();

            $('.pstopbadge').removeClass('active');
            $('.pstopbadge:first').addClass('active');
            $('.peoplesHolder').show();
            $('.servicesHolder').hide();
          // }
        });

        $(document).on('keyup', '#showsimilaruserinput', function(event){
          event.preventDefault();
          var searchText = $(this).val();
          if((searchText != undefined) && (searchText != '')){
              setTimeout(function() {
                self.showSimilarUsers(searchText);   
              }, 200);
          }
        });

        $(document).on('keyup', '.searchChannelOrUsers input', function(event){
          event.preventDefault();
          var searchWhat = $(this).attr('data-search');
          var searchText = $(this).val();
          if(searchWhat == 'users'){            
            if((searchText != undefined)){
                if(self._currentChannel != ''){
                  setTimeout(function() {
                    self.showSimilarUsersOfChannelv2(searchText,self._currentChannel,function(){});   
                  }, 200);
                }
            }
          }
          else{
            // search for channels in portal 
            console.log('searching channel names ...');
            if(searchText != undefined){
              //var container = $('#active-portal-channels');
               var container = $('.portalchannelsholder');
               container.show();
              setTimeout(function() {
                self.searchChannelsOnPortals(searchText,self._currentPortal,function(foundChannels){
                  console.log(foundChannels);
                  container.html('');
                    foundChannels.forEach(function(channel) {     
                        // all found  channel
                        var tpl = `
                        <div class="iconItem reqtojoinchannel icon-item-yellow" data-id="`+channel.cId+`" style="">
                        <span class="image iconImage img-cir img-70 cursorPointer centerIconWrap" style=""></span>
                        <span class="iconName" style="">`+channel.cData.name+`</span>                        
                        </div>
                        `;
                        container.append(tpl);    
                    });
                  
                });    
              }, 200);
            }
          }
        });

        $(document).on('click', '.addusertochanneltrigger', function(event){
          event.preventDefault();
          var userId = $(this).parents('.list-group-item:first').attr('data-id');
          if(self._currentChannel != ''){
            self.addUserToChannel(userId,self._currentChannel,function(){
              self.showNotifcation('User added to channel successfully',function(){});
              if(self._currentChannel != ''){
                self.showUsersOfChannel(self._currentChannel);
              }
            });
          }
        });
          
        $(document).on('submit', '#userinvitefrom', function(event){
          event.preventDefault();
          var userEmail = $(this).find('#invite-email').val();
          var crntForm = $(this);
          if(userEmail != ''){
            //window.open('mailto:'+userEmail+'?subject=Talkee Invitation&body=Your friend Invited you to <a href="#">talkee</a>');
            console.log(userEmail);
            self.createInviteLink(self._currentPortal,userEmail,function(data){
              if(data.error == false){
                self.getPortalDetails(self._currentPortal,function(portalData){
                  var baseUrl = 'https://www.talkee.co.uk/app';

                  self.isAlredyRegistered(userEmail,function(isReg){
                    if(isReg){
                      var link = baseUrl+'/'+portalData.url+'?join='+data.id;
                    }                    
                    else{
                      var link = baseUrl+'/signup?portal='+portalData.url+'&join='+data.id;
                    }
                    // console.log('link',link)
                    // $('#copyJoinLinkModal').find('input').val(link)
                    // $('#copyJoinLinkModal').modal('show'); 
                    console.log(link); 
                    $.ajax({
                      url: 'sendmail.php',
                      type: 'POST',
                      dataType: 'json',
                      data: {email: userEmail, link: link},
                      success:function(data){
                        
                        if(data.error == false){                          
                            self.notifyUser('Invitation sent to user.');
                            crntForm.find('#invite-email').val('');
                        }
                        else{
                          self.notifyUser('Error occured please try again.')
                        }
            
                      }
                     });
                  })
                                  
                })
              }
              console.log(data);
            });

            /* $(location).attr('href', 'mailto:'+userEmail+'?subject='
                                     + encodeURIComponent("Talkee Invitation")
                                     + "&body=" 
                                     + encodeURIComponent("Your friend Invited you to http://www.talkee.co.uk/app")
            ); */
          }
        });

        $(document).on('click', '.requestshandleUItrigger', function(event){  
          $('.dashboardPage').hide();
          $('.requestsPageUI').show();
          self.showRequestsToChannels();
        });

        $(document).on('click', '.activateChatRoom', function(event){  
          $('.chatBox').find('#talkeeChatMainBox').html('');
          $('#talkeeChatMainBox').html('');
          $('.talkeeChatUi').find('#talkeeChatMainBox').html('');

          $('.header-desktop2').hide();
          $('.au-kick-user').hide();
          $('.page-container2').addClass('margtopzero');
          $(this).find('.iconImage').removeClass('notification-status');
          var chatRoomMember = new Array();
          var toMember = $(this).attr('data-id');
          if(toMember != firebase.auth().currentUser.uid){
            chatRoomMember.push(firebase.auth().currentUser.uid);
            
            chatRoomMember.push(toMember);
            $('.dashboardPage').hide();

            var vlayerid = $(this).attr('data-vid');
            
            // set voicelayer token
            if (vTokenId) {
              console.log("before create channel, token = " + vTokenId);
              // voicelayer.auth.setToken(vTokenId);
              // voicelayer.connect();
            }

            // create direct channel
            voicelayer.channels.createDirect(vlayerid, function(err, data) {
              if (!err) {
                console.log(data);
                vChannelId = data.id;
                console.log("Successfully created direct channel = " + vChannelId);

                self.activateTheChatRoom({members: chatRoomMember},function(roomId){
                  self._activeChatRoomId = roomId;
                  self.setActiveChatRoomReciever(toMember);
                  $('.chatBox').find('#talkeeChatMainBox').html('');
                  $('.chatBox').show(0,function(){
                    var element = document.getElementById("talkeeChatMainBox");
                    element.scrollTop = element.scrollHeight;
                    // We load currently existing chat messages and listen to new ones.
                    self.loadMessages(self._activeChatRoomId);

                    // hide existing button
                    // $('.record-trigger').show();
                    $('.vlayer-record').show();
                       //self.isMobile = true;
                    if(self.isMobile){
                      $('.au-chat__content_only_recordtrigger').show();
                      $('.au-mainchatbox').hide();
                    }
                  });

                  // show or hide kick user button based on admin
                  self.getChannelDetails(self._currentChannel,function(channelData){
                    if(channelData.createdBy == firebase.auth().currentUser.uid){
                      $('.au-kick-user').show();
                    }
                    else{
                      $('.au-kick-user').hide();
                    }
                  });              
                });
              } else {
                alert(err);
                return false;
              }
            });
          }
          
        });

        $(document).on('click', '.deleterequesttochannel', function(event){
          var cid = $(this).parents('.channel-requests:first').attr('data-id');
          var reqForUserId = $(this).parents('.channel-requests:first').attr('data-reqUnder');
          var requserId = $(this).parents('.list-group-item:first').attr('data-requserid');
          var curEle = $(this);
          self.delRequestToChannel(cid,reqForUserId,requserId,function(){
            // deleteed update ui
            curEle.parents('.list-group-item:first').remove();
          });
        });

        $(document).on('click', '.addusertochannel', function(event){
          var cid = $(this).parents('.channel-requests:first').attr('data-id');
          var reqForUserId = $(this).parents('.channel-requests:first').attr('data-reqUnder');
          var requserId = $(this).parents('.list-group-item:first').attr('data-requserid');
          var curEle = $(this);
          self.addChannelToUserListOnly(requserId,cid,function(){
            self.addUsersNotifcation([firebase.auth().currentUser.uid],'User added to channel successfully');
            
            self.getChannelDetails(cid,function(channelData){    
              self.addUsersNotifcation([requserId],channelData.name+' admin, has accepted your request.');
            });  
            /* self.getChannelUsers(cid,function(members){
              self.getUserDetails(requserId,function(userData){
                self.getChannelDetails(cid,function(channelData){                  
                  if(members.length>0){
                    var notiMsg = userData.data.name+' joined the channel " '+channelData.name+'"';
                    self.addUsersNotifcation(members,notiMsg);
                  }
                });                
              });              
            }) */
            self.delRequestToChannel(cid,reqForUserId,requserId,function(){
              // deleteed update ui
              curEle.parents('.list-group-item:first').remove();
            });
          });
        });

        

        $('#staticModal').on('show.bs.modal', function (e) {
          console.log('show.bs.modal');
          $(this).find('input').val($('.settingsUsername:first').text());
          $(this).find('input').trigger('focus');
        });

        $(document).on('click', '#staticModal .btn', function(event){
          event.preventDefault();
          var name = $('#staticModal').find('input').val();
          if(name != ''){
            self.updateUserName(name);
          }
          $('#staticModal').modal('hide');
        });

        $(document).on('click', '#statusmodel .btn', function(event){
          event.preventDefault();
          var name = $('#statusmodel').find('select').val();
          if(name != ''){
            self.updateUserStatus(name,function(){});
          }
          $('#statusmodel').modal('hide');
        });

        /* $(document).on('change', '#mediaCapture', function(event){
          self.onMediaFileSelected(event);
        });

        $(document).on('click', '#uploadFiles', function(event){
          event.preventDefault();
          $('#mediaCapture').trigger('click');
        }); */

        $(document).on('submit', '.au-form-icon', function(event){
          event.preventDefault();

          // vlayer send message
          var message = {
            text: $('.au-input').val()
          }

          console.log("send txt to channel : " + vChannelId);

          voicelayer.channels.createMessage(vChannelId, message, function(err, data) {
            var messageId = data.id;
            // do something with the message
            console.log(data);
          });
          
          self.onMessageFormSubmit();
        });

        $(document).on('submit', '#create-channel-form', function(event){
          event.preventDefault();
          var curEle = $(this);
          var portalText = $('#createChanneltext').val();
          if((portalText == '')){
            self.showNotifcation('Please enter a channel name',function(){});
          }
          else{    
            // reset ui        
            curEle.find('#createChanneltext').val('');
            curEle.find('#create-channel-button').attr('disabled','disabled');
            // active portal id
            
            
              var portalId = self._currentPortal;
              self.createChannel(portalId,portalText,function(data){
                console.log(data);
                if(data.error == false){
                  self.showNotifcation('Channel Created Successfully',function(){});
                  curEle.find('#create-channel-button').removeAttr('disabled');
                }
              });
            
            
          }
          
        }); 

        // file upload events
        $(document).on('change', '#fileUploadCapture', function(event){          
          self.onMediaFileSelectedForFileUPloading(event);
        });

        $(document).on('click', '#uploadFiles', function(event){
          console.log('button clicked')
          event.preventDefault();
          $('#fileUploadCapture').trigger('click');
        });

        $(document).on('click', '.file-downicon', function(event){          
          event.preventDefault();
          self.CustomDownload($(this).attr('data-name'),$(this).attr('data-src'));
        });

        

        

        if(self.isMobile){

          // voice layer start record message
          $(document).on('touchstart', '.vlayer-record', function(event){
            if(self._activeChatRoomId == ''){
              return false;
            }

            if (!voicelayer.recorder.isMicEnabled()) {
              alert("Mic not enabled");
              voicelayer.recorder.requestMicAccess(function(err) {
                if (err) {
                  alert("Mic cannot enabled");
                  return;
                }
              });
            } else {
              $(this).addClass('red-back');
              // Now ready for recording
              console.log("start recording for channel: " + vChannelId);
              vLastMsgId = voicelayer.channels.recordMessage(vChannelId, {type: "voice" });
              console.log("created message id: " + vLastMsgId);
            }

          });

          // voice layer stop record message
          $(document).on('touchend', '.vlayer-record', function(event){
            if(self._activeChatRoomId == ''){
              self.showNotifcation('Please select user.',function(){});
              return false;
            }

            if ($(this).hasClass('red-back')) {
              $(this).removeClass('red-back');
              voicelayer.recorder.stop();
              voicelayer.recorder.getDuration(function(err, duration) {
                console.log("recording stopped duration:" + duration);
                console.log("current token = " + vTokenId);
                console.log("created message id: " + vLastMsgId);
                var message = { duration: duration };
                voicelayer.messages.update(vLastMsgId, message, function(err, data) {
                  // do something with updated message
                  if (data.type === "voice") {
                    console.log("record finished, will added : " + data.id);
                    self.showVoiceLayer(data);
                  }
                });

              });

            }
            
          });

          /*
          $(document).on('touchend', '.record-trigger', function(event){
            if(self._activeChatRoomId == ''){
              return false;
            }
            var recordingState = $(this).attr('data-recording');   
            $(this).find('img').attr('src','images/Record_Large.png');    
            if(recordingState == 1){
              // stop recored and export aduio
              
              self.stopCounter(0,$(this));        
              self.stopRecording();
            }
          });

          $(document).on('touchstart', '.record-trigger', function(event){
            if(self._activeChatRoomId == ''){
              return false;
            }
            var recordingState = $(this).attr('data-recording');       
            if(recordingState == 0){
              $(this).attr('data-recording',1);       
              $(this).addClass('red-back');       
              $(this).tooltip({
                title: '0 Second',
                trigger: 'manual'
              });
              $(this).attr('data-original-title', '0 Second').tooltip('show');
              $(this).find('img').attr('src','images/Record_Large_Active.png');
              self.recordCounter(1000,$(this));
              self.startRecording();
              $('body').find('#onrecordtone').trigger('play');
            }
          });
          */
          
        }
        else{
          $('body').keydown(function (event) {
            // space key up
            if (event.keyCode == 32) { 
              
              if(!($( document.activeElement).is(':focus'))){
                // var recordTriggerEle = $('.menu-sidebar2').find('.record-trigger:first');
                var recordTriggerEle = $('.menu-sidebar2').find('.vlayer-record:first');
                if(recordTriggerEle.length>0){
                // var recordingState = recordTriggerEle.attr('data-recording');       
                // var triggerEvent = (recordingState == 0)? 'mousedown' : 'mouseup';
                recordTriggerEle.trigger('mousedown');
                }
              }
            }
          });
          $('body').keyup(function (event) {
            // space key up
            if (event.keyCode == 32) { 
              
              if(!($( document.activeElement).is(':focus'))){
                // var recordTriggerEle = $('.menu-sidebar2').find('.record-trigger:first');
                var recordTriggerEle = $('.menu-sidebar2').find('.vlayer-record:first');
                if(recordTriggerEle.length>0){
                recordTriggerEle.trigger('mouseup');
                }
              }
            }
          });
          /*
          $(document).on('mouseup', '.record-trigger', function(event){
            if(self._activeChatRoomId == ''){
              self.showNotifcation('Please select user.',function(){});
              return false;
            }
            var recordingState = $(this).attr('data-recording');       
            if(recordingState == 1){
              // stop recored and export aduio
              
              self.stopCounter(0,$(this));        
              self.stopRecording();
            }
          });

          $(document).on('mousedown', '.record-trigger', function(event){
            if(self._activeChatRoomId == ''){
              return false;
            }
            var recordingState = $(this).attr('data-recording');       
            if(recordingState == 0){
              $(this).attr('data-recording',1);       
              $(this).addClass('red-back');       
              $(this).tooltip({
                title: '0 Second',
                trigger: 'manual'
              });
              $(this).attr('data-original-title', '0 Second').tooltip('show');
              self.recordCounter(1000,$(this));
              self.startRecording();
              // $('body').find('#onrecordtone').trigger('play');
            }
          });
          */

        }

        // voice layer start record message
        $(document).on('mousedown', '.vlayer-record', function(event){
          if(self._activeChatRoomId == ''){
            return false;
          }

          if (!voicelayer.recorder.isMicEnabled()) {
            alert("Mic not enabled");
            voicelayer.recorder.requestMicAccess(function(err) {
              if (err) {
                alert("Mic cannot enabled");
                return;
              }
            });
          } else {
            $(this).addClass('red-back');
            // Now ready for recording
            console.log("start recording for channel: " + vChannelId);
            vLastMsgId = voicelayer.channels.recordMessage(vChannelId, {type: "voice" });
            console.log("created message id: " + vLastMsgId);
          }

        });

        // voice layer stop record message
        $(document).on('mouseup', '.vlayer-record', function(event){
          if(self._activeChatRoomId == ''){
            self.showNotifcation('Please select user.',function(){});
            return false;
          }

          if ($(this).hasClass('red-back')) {
            $(this).removeClass('red-back');
            voicelayer.recorder.stop();
            voicelayer.recorder.getDuration(function(err, duration) {
              console.log("recording stopped duration:" + duration);
              console.log("current token = " + vTokenId);
              console.log("created message id: " + vLastMsgId);
              var message = { duration: duration };
              voicelayer.messages.update(vLastMsgId, message, function(err, data) {
                // do something with updated message
                if (data.type === "voice") {
                  console.log("record finished, will added : " + data.id);
                  self.showVoiceLayer(data);
                }
              });

            });

          }
          
        });

        $(document).on('click', '.sound-button', function(event){          
          var state = $(this).attr('data-volume');
          state = (state == 'On')? 'Off': 'On';
          self.updateVolume(state,function(){}); 
          var ele = $('#talkeeChatMainBox').find('.audioele');
          var volume = (state == 'On')? 1: 0;
          if(volume == 0){
            ele.removeAttr('muted');
            $(this).find('img').attr('src','images/Volume_OFF.png');
            $(this).find('span').css('background-image','url(images/Volume_OFF.png)');
          }
          else{
            $(this).find('img').attr('src','images/Volume_ON.png');
            $(this).find('span').css('background-image','url(images/Volume_ON.png)');
          }
          ele.prop("volume", volume);    
        });

        $(document).on('click', '.autoplay-button', function(event){
          // $('.sound-button').attr('data-volume',volume);
          // $('.autoplay-button').attr('data-autoplay',autoplay);
          var crntEle = $(this);
          var state = crntEle.attr('data-autoplay');
          state = (state == 'On')? 'Off': 'On';
          self.updateAutoplay(state,function(){
            if(state == 'Off'){
              noSleep.disable();
              $('#mainaudio-player').find('audio').remove();        
              $('#now_player_icon').hide();
              self.audioQueuePlaying = false;    
            }
            else{
              // autoplay on
              noSleep.enable(); 
              // console.log('noSleep',noSleep);
            }            
            $('.autoplay-button').attr('data-autoplay', state);
            var msgonMobile = ((self.isMobile) && (state == 'On'))? ' (Device will stay awake)': '';
            self.showNotifcation('Autoplay turned '+state+msgonMobile,function(){});
            
          });
          
        });

        $(document).on('click', '#deletePortal', function(event){
          self.DeletePortal(self._currentPortal,function(){});
          
        });
        

        $(document).on('click', '.channel-leave-btn', function(event){
          var curEle = $(this);
          var cid = self._currentChannel;
          var userId = firebase.auth().currentUser.uid;
          self.leaveTheChannel(userId,self._currentChannel,function(result){
            if(result){
              curEle.hide();
              $('.backtomainportal').trigger('click');
              self.getChannelUsers(cid,function(members){
                
                  self.getChannelDetails(cid,function(channelData){
                    /* members = _.reject(members, function(d){ return d === requserId; });
                    members = _.reject(members, function(d){ return d === firebase.auth().currentUser.uid; }); */
                    if(members.length>0){
                      var notiMsg = self._currentUser.name+' left the channel " '+channelData.name+'"';
                      self.addUsersNotifcation(members,notiMsg);
                    }
                  });                
                          
              })
            }
          });          
        });

        $(document).on('click', '.channel-delete-btn', function(event){
          var curEle = $(this);
          var cid = self._currentChannel;
          
          self.getChannelUsers(cid,function(members){                
            self.getChannelDetails(cid,function(channelData){
              self.deleteTheChannel(cid,function(result){ });                         
              if(members.length>0){
                var notiMsg = channelData.name+' channel removed by admin.';
                self.addUsersNotifcation(members,notiMsg);
                members.forEach(function(singleMember) {
                  
                  self.getUserDetails(singleMember,function(userData){
                    if(userData.data.activeChannelId == cid){
                      self.resetActiveChannelOfUser(singleMember,function(){});
                    }
                  })
                });                
              }
            });             
          })     
        });


        $(document).on('click', '.switchtofullchatbox', function(event){
          $(this).parents('.au-chat__content_only_recordtrigger:first').hide(); 
          $(this).parents('.au-chat:first').find('.au-mainchatbox').show();       
        });


        $(document).on('change', '#notificationCheckbox', function(event){
          var state = this.checked;
          state = (state == false)? 'Off': 'On';
          self.updateNotification(state,function(){
            if(state == 'Off'){
              // $('#mainaudio-player').find('audio').remove();        
              // $('#now_player_icon').hide();
              // self.audioQueuePlaying = false;    
              // user alert
            }
          });    
        });

        $(document).on('click', '.pstopbadge', function(event){
          $('.pstopbadge').removeClass('active');
          $(this).addClass('active');
          if($(this).attr('data-id') == 'people'){
            $('.peoplesHolder').show();
            $('.servicesHolder').hide();
          }
          else{
            $('.peoplesHolder').hide();
            $('.servicesHolder').show();
          }
          $('.addUserToChannelPage').hide();
        });

        $(document).on('click', '.showInviteUI', function(event){
          $('.addUserToChannelPage').show();
        }); 
        $(document).on('click', '.backtopeopleservicespage', function(event){
          $('.addUserToChannelPage').hide();
        });

        $(document).on('click', '.switchtorecordscreenonly', function(event){
          $('.au-chat__content_only_recordtrigger').show();
          $('.au-mainchatbox').hide();
        });

        $(document).on('click', '.notifcation-btnwrap', function(event){
          event.preventDefault();
          $(this).find('.notification-deskbtn-counter').hide();
        });

        $(document).on('click', '#page-dahsboard', function(event){
          self.backToOnline();
        });

        
        $(document).on('click', '.au-kick-user', function(event){
          self.getChannelDetails(self._currentChannel,function(channelData){
            if(channelData.createdBy == firebase.auth().currentUser.uid){
              // get oponent user
              if(self._activeChatRoomReceiver != ''){
                var userId = self._activeChatRoomReceiver.id;
                // channel remove from users list 
                firebase.database().ref('/channel-users/users/'+userId+'/'+self._currentPortal+'/'+self._currentChannel).remove();
                // user remove from channel user list
                firebase.database().ref('/channel-users/channels/'+self._currentChannel+'/'+userId).remove();
                $('.showmaindashboard').trigger('click');
              }

            }
            
          })
        });

        // lock portal handling
        $(document).on('submit', '#lockportalform', function(event){
          event.preventDefault();
          
        });

        $(document).on('click', '#regsigninlink', function(event){
          
          var state = $(this).parents('form:first').attr('data-state');
          var newState = (state == 'signup')? 'signin': 'signup';
          var crntForm = $(this).parents('form:first');
          crntForm.attr('data-state', newState);

          crntForm.find('.regsign-error').removeClass('show').addClass('hide');
          self.readyRegSignForm(newState);

        });
        $(document).on('click', '.passshowtoggle', function(event){
          var targetEle = $(this).parents('.input-group:first').find('input:first');
          var type = targetEle.attr('type');
          var newType = (type == 'password')? 'text': 'password';
          targetEle.attr('type',newType);

        });
        
        $(document).on('submit', '.regsigninfromwrap form', function(event){
          event.preventDefault();
          var name = $(this).find('#formregs-name').val();
          var surname = $(this).find('#formregs-surname').val();
          var email = $(this).find('#formregs-email').val();
          var pass = $(this).find('#password2').val();
          var crntForm = $(this);
          var state = crntForm.attr('data-state');
          var error = [];
          if(validator.isEmail(email) == false) {
            error.push('Email is not valid')
          }
          if(state == 'signup'){
            if(validator.isEmpty(name) == true) {
              error.push('Name is required');
            }
          }
          if((validator.isEmpty(pass) == true) || (pass.length<8)) {
            var passMsg = (state == 'signup')? 'Password is not valid, should minimum 8 characters in length' : 'Password is not valid';
            error.push(passMsg);
          }
          
          if(error.length>0){
            crntForm.find('.regsign-error').find('.errorlist').text(error.join(", "));
            crntForm.find('.regsign-error').removeClass('hide').addClass('show');
            // $('.alert').alert()
          }
          else{
            crntForm.find('.regsign-error').removeClass('show').addClass('hide');
          }
          if(error.length == 0){
            
            if(state == 'signup'){
              self.emailsignupname = name+' '+surname;
              console.log('state',state);
              firebase.auth().createUserWithEmailAndPassword(email, pass)
                .then(function(value) {
                  // register user in voice layer
                  var params = {
                    name: self.emailsignupname,
                    email: email,
                    password: pass,
                    password_confirmation: pass
                  }

                  voicelayer.auth.register(params, function(err, data) {
                    if (!err) {
                      console.log('registered voicelayer user data');
                      console.log(data);

                      // login if register success
                      voicelayer.auth.login(email, pass, function(err, data) {
                        if (err) {
                          console.log(data.error);
                          // The error response from the server will be available in data.error
                        } else {
                          // The data object represents the user
                          console.log('login voicelayer user data');
                          console.log(data);

                          var userId = firebase.auth().currentUser.uid;

                          // update voice layer id and token
                          firebase.database().ref('/users/' + userId + '/vlayerid').set(data.id).catch(function(error) {
                            console.error('vlayer id update to FB fail', error);
                          });

                          firebase.database().ref('/users/' + userId + '/vtoken').set(data.token).catch(function(error) {
                            console.error('vtoken id update to FB fail', error);
                          });

                        }
                      });
                    } else {
                      console.log(err);
                    }
                  });

                })
                .catch(function(error) {
                    // Handle Errors here.
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    if (errorCode == 'auth/weak-password') {
                      errorMessage = 'The password is too weak, Please enter a strong password';
                    } else {
                      
                    }

                    crntForm.find('.regsign-error').find('.errorlist').text(errorMessage);
                    crntForm.find('.regsign-error').removeClass('hide').addClass('show');

                    console.log(error);
                  });
            }
            else{
                firebase.auth().signInWithEmailAndPassword(email, pass)
                .then(function(firebaseUser) {
                  console.log("sign in success");

                  voicelayer.auth.login(email, pass, function(err, data) {
                    if (err) {
                      console.log(data.error);
                      // The error response from the server will be available in data.error
                    } else {
                      // The data object represents the user
                      console.log('login voicelayer user data');
                      console.log(data);

                      var userId = firebase.auth().currentUser.uid;

                      // update voice layer id and token
                      firebase.database().ref('/users/' + userId + '/vlayerid').set(data.id).catch(function(error) {
                        console.error('vlayer id update to FB fail', error);
                      });

                      firebase.database().ref('/users/' + userId + '/vtoken').set(data.token).catch(function(error) {
                        console.error('vtoken id update to FB fail', error);
                      });

                    }
                  });

                })
                .catch(function(error) {
                  // Handle Errors here.
                  var errorCode = error.code;
                  var errorMessage = error.message;
                  if (errorCode === 'auth/wrong-password') {
                    // alert('Wrong password.');
                    errorMessage = 'Wrong password.';
                  }

                  crntForm.find('.regsign-error').find('.errorlist').text(errorMessage);
                  crntForm.find('.regsign-error').removeClass('hide').addClass('show');

                  console.log(error);
                });
            }
          }
        });


        

        

        window.onerror = function(msg, url, linenumber) {
          var error = 'Error message: '+msg+'\nURL: '+url+'\nLine Number: '+linenumber;
          // self.showNotifcation(error,function(){});
          return true;
        }
        
    }





    /* var config = {
        apiKey: "AIzaSyBneVFGGxyB8oo_sdYDOdEgLsyxAzgX9Nk",
        authDomain: "talkee-d4100.firebaseapp.com",
        databaseURL: "https://talkee-d4100.firebaseio.com",
        projectId: "talkee-d4100",
        storageBucket: "talkee-d4100.appspot.com",
        messagingSenderId: "708610098712"
      }; */
      var config = {
        apiKey: "AIzaSyCKAm-iR6DHM_4dCBDlklPHYxoo5EW0ptM",
        authDomain: "talkee-firebase.firebaseapp.com",
        databaseURL: "https://talkee-firebase.firebaseio.com",
        projectId: "talkee-firebase",
        storageBucket: "talkee-firebase.appspot.com",
        messagingSenderId: "727496403838"
      };
    firebase.initializeApp(config);
    
    var fireBaseRef = firebase.database().ref(); 

    var talkeeApp = new TalkeeIM(fireBaseRef,{});

    

})();