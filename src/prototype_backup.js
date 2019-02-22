require('./vendors.js');
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
        this._currentUserId = null;
        this._currentPortal = null;
        this._currentChannel = null;
        this._exploreChannelList = new Array();
        this._channelUsersList = new Array();
        this._activeChatRoomId = '';
        this._activeChatRoomReceiver = '';
        this._voiceRecorder = null;
        this._audioStream = null;
        this._voiceTracks = null;
        this._lastTimer = null;
        this.recordIterator = 1;
        this.recordTimout = 22;
        this.audioQueue = [];
        this.audioQueuePlaying = false;
        this.roomSubscribes = [];
        this._loadingImageUrl = 'images/icon/loading.gif';
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
        // Sign out of Firebase.    
        firebase.auth().signOut();
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
      console.log('new user data adding...')
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
        console.log('sving name ...')
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
        console.log('sving name ...')
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
        console.log('sving name ...')
        var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid;     
        firebase.database().ref('/users/' + userId+'/volume').set(volume).then(function(){
          cb();
        }).catch(function(error) {
          console.error('Error writing new message to Firebase Database', error);      //    
        });
      }
    }

    TalkeeIM.prototype.updateAutoplay = function(autoplay,cb){
      var self = this;
      if(autoplay != ''){
        console.log('sving name ...')
        var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid;     
        firebase.database().ref('/users/' + userId+'/autoplay').set(autoplay).then(function(){
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
            // register users if not 
            self.saveUserInfo(function(usertype){
              if(usertype == 'newuser'){
              var userInfo = firebase.auth().currentUser;
              // console.log(userInfo);   
              // console.log(userInfo.displayName);   
              // console.log(userInfo.uid);   
              var userId = userInfo.uid;   
              console.log('new user data adding...')
              var data = {
                name: userInfo.displayName,
                avatar: userInfo.photoURL,
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
              $('#page-login').show();
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

    TalkeeIM.prototype.onUserUpdate = function() {
      var self = this;
      // on update user data
      var userId = firebase.auth().currentUser.uid;
      var realtimeUpdate = firebase.database().ref('users/' + userId);
      realtimeUpdate.on('value', function(snapshot) {
        var data = snapshot.val();
        if(data != null){
          console.log('realtime update user data');
          self.setCurrentUser(data);
          self._currentUserId = snapshot.key;
          $('.cuserAvatar').attr('src',data.avatar);
          $('.settingsUsername').html(data.name);
          $('.settingsUserstatus').html(data.status);
          $('.user-sidbarstatus').removeClass('Online Offline Away Busy').addClass(data.status);
          $('.user-sidbarstatus span:first').html(data.status);
          var volume = (data.volume)? data.volume: 'On';
          var autoplay = (data.autoplay)? data.autoplay: 'On';
          $('.sound-button').attr('data-volume',volume);
          $('.autoplay-button').attr('data-autoplay',autoplay);
          // update ui
          var btnClass = (volume == 'On')? 'fa-volume-up': 'fa-volume-off';
          $('.sound-button').find('.fa').removeClass('fa-volume-up fa-volume-off').addClass(btnClass);

          if(autoplay == 'On')
          $('.autoplay-button').find('.fa').removeClass('dim-btn');
          else
          $('.autoplay-button').find('.fa').addClass('dim-btn');

          self._currentChannel = (data.activeChannelId)? data.activeChannelId: '';
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
        console.log('sving name ...')
        var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid;     
        firebase.database().ref('/users/' + userId+'/status').set(status).then(function(){
          cb();
        }).catch(function(error) {
          console.error('Error writing new message to Firebase Database', error);      //    
        });
      }
    }

    TalkeeIM.prototype.showPage = function(){
      var self = this;
      console.log('showpage called')
      var userInfo = firebase.auth().currentUser;
      var userId = userInfo.uid;   
      
      firebase.database().ref('/users/' + userId).once('value', function(snapshot) {
        var data = snapshot.val();
        if(data != null){
          if(data.onPage == 2){
            $('.page').hide();
            $('#regsteps, #page-portal_select').show(0,function(){
              $('#page-portal_select').find('#join-portal-button').removeAttr('disabled')
            });
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
              $('#regsteps, #page-join-portal-onsignin').show(0);
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
      var self = this;
      $('.page').hide();
      $('.cuserAvatar').attr('src',userData.avatar);
      $('.settingsUsername').html(userData.name);
      $('.settingsUserstatus').html(userData.status);
      
      self.getPortalDetails(portalId,function(data){
        $('.activePortallName').html(data.name+' / ');
        $('#page-dahsboard').show(0,function(){
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
      var self = this;
      self.getChannelDetails(channelId,function(channelData){
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
            $('.searchChannelOrUsers input').attr('placeholder','Search Users');
            $('.channel-leave-btn').show();
            //self.subscribeTooChannelRoomMsgs(self._currentChannel,function(){});
            self.subscribeTooChannelNewRoomAddition(self._currentChannel);
          }
        })
      })
    }

    TalkeeIM.prototype.getPortalDetails = function(portalId,cb){
      var data = {};
      firebase.database().ref('/portals/' + portalId).once('value', function(snapshot) {
        data = snapshot.val();
        cb(data);
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

    TalkeeIM.prototype.resetActivePortal = function(cb){
      var userId = firebase.auth().currentUser.uid;
      firebase.database().ref('/users/' + userId+'/activePortalId').set('').then(function(){
        cb();
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

    TalkeeIM.prototype.createOrJoinPortal = function(type, textOrId, cb){
      var self = this;
      var userInfo = firebase.auth().currentUser;
        var userId = userInfo.uid;     
      if(type == 'create'){
        var data = {
          name: textOrId,
          avatar: "",
          isPrivate: "false",
          password: "",
          createdBy: userId,
          createdAt: Date.now(),
        }
        
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
        snapshot.forEach(function(childSnapshot) {        
          firebase.database().ref('/users/' + childSnapshot.key).once('value', function(snapshot) {
            var data = snapshot.val();
            if(data != null){
              self._channelUsersList.push({id:snapshot.key, data: snapshot.val()});      
              
              var username = (firebase.auth().currentUser.uid == snapshot.key)? 'You' : data.name;
              $('.active-channel-users').append(`
              <div class="iconItem icon-item-gray position-relative activateChatRoom" style="" data-id="`+snapshot.key+`" id="acid`+snapshot.key+`">
                      <span class="avatarWithStatus image iconImage img-cir img-70 cursorPointer centerIconWrap" style="">
                      <img src="`+data.avatar+`" alt="John Doe" class="">
                      </span>
                      <span class="iconName" style="">`+username+`</span>                        
              </div>
              `);
              self.subscribeToonUserStatusChange(snapshot.key);    
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
        
        console.log(res.key);
        var userId = firebase.auth().currentUser.uid;
    
        firebase.database().ref('/channel-users/channels/'+res.key).child(userId)
            .set(userId);
        firebase.database().ref('/channel-users/users/'+userId+'/'+portalId).child(res.key)
            .set(res.key);
        self.addUserToChannel(userId,res.key,function(){
          firebase.database().ref('/portal-channels/'+portalId).child(res.key)
          .set(res.key).then(function(){
            var resutlt= {
              error: false
            };
            cb(resutlt);
          });
        });
        
    
        
    
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
                  <div class="iconItem icon-item-gray" style="" data-id="`+userData.id+`">
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
        if(searchText != ''){
          var cName = cUser.data.name.toLowerCase();
          if(cName.search(searchText.toLowerCase()) != -1){
          var username = (firebase.auth().currentUser.uid == cUser.id)? 'You' : cUser.data.name;
          $('.active-channel-users').append(`
          <div class="iconItem icon-item-gray" style="" data-id="`+cUser.id+`">
                  <span class="image iconImage img-cir img-70 cursorPointer centerIconWrap" style="">
                  <img src="`+cUser.data.avatar+`" alt="John Doe" class="cuserAvatar">
                  </span>
                  <span class="iconName" style="">`+username+`</span>                        
          </div>
          `);
          }
          }
          else{
            var username = (firebase.auth().currentUser.uid == cUser.id)? 'You' : cUser.data.name;
            $('.active-channel-users').append(`
            <div class="iconItem icon-item-gray" style="" data-id="`+cUser.id+`">
            <span class="image iconImage img-cir img-70 cursorPointer centerIconWrap" style="">
            <img src="`+cUser.data.avatar+`" alt="John Doe" class="cuserAvatar">
            </span>
            <span class="iconName" style="">`+username+`</span>                        
            </div>
          `);
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

    TalkeeIM.prototype.addUserToChannel = function(userId,channelId,cb){
      var self = this;
      firebase.database().ref('/channel-users/channels/'+channelId).child(userId)
      .set(userId).then(function(){
        firebase.database().ref('/channel-users/users/'+userId+'/'+self._currentPortal).child(channelId)
          .set(channelId).then(function(){
            cb({error: false})
          });
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
                  <img src="`+snapVal.avatar+`" alt="John Doe" class="cuserAvatar">
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
                });
              });
    
            }); 
            // request by users on channel
            reqChildSnapshot.forEach(function(reqChild2Snapshot) {
              var rUserId = reqChild2Snapshot.key;
              console.log('userid', rUserId);
            });
              
    
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

    TalkeeIM.prototype.loadMessages = function(roomId) {
      var self = this;
      // Loads the last 12 messages and listen for new ones.
      var callback = function(snap) {
        console.log('callback working...')
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
        self.displayMessage(msgData,false);
      };
    
      firebase.database().ref('/messages/'+self._activeChatRoomId).limitToLast(12).on('child_added', callback);
      firebase.database().ref('/messages/'+self._activeChatRoomId).limitToLast(12).on('child_changed', callback);
      /* var callback2 = function(snap) {
        console.log('last callback working...');
        self.autoplayLastAudio();

      };
      firebase.database().ref('/messages/'+self._activeChatRoomId).limitToLast(1).on('child_added', callback2);
      firebase.database().ref('/messages/'+self._activeChatRoomId).limitToLast(1).on('child_changed', callback2); */
      
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
          alert('This file type not supported');
          return;
        }
      }
      else{
        alert('Upload File within 20MB');
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
                messageRef.update({
                  url: upData.filePath,
                });
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
      
      let onFail = function(e) {
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
				/** 
				 * ask permission of the user for use microphone or camera  
				 */
				navigator.getUserMedia({audio: true}, onSuccess, onFail); 																			
			} else {
				alert('navigator.getUserMedia not present');
			}

    }

    TalkeeIM.prototype.stopRecording =  function() {
      //alert('stop recording called');
      var self = this;
      if(self._voiceRecorder != null){
        console.log('Stop Recording...');
        //alert('Stop Recording...');
        
        self._voiceRecorder.stop();
        self._voiceTracks.forEach(track => track.stop());
        self._voiceRecorder.exportWAV(function(s) {          
          self.saveVoiceOnServer(s);
          //alert('record saving');
          self._voiceRecorder = null;
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
          sound.preload = "auto";
          if(volume == 'Off'){
            sound.volume = 0;
          }
          $('.now_player_icon_avatar').attr('src',audioData.avatar);
          document.getElementById('mainaudio-player').appendChild(sound);
          self.audioQueuePlaying = true;
        

          sound.onplay = function() {
            $('#now_player_icon').show();
          };
          sound.onended = function() {
            console.log('On ended called');
            $('#now_player_icon').hide();
            self.audioQueuePlaying = false;
            playSound()
          };
        }
      }
      }
      playSound();
      
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
          alert('Current portal deleted');
          $('.page').hide();
          $('#regsteps, #page-portal_select').show(0,function(){
            $('#page-portal_select').find('#join-portal-button').removeAttr('disabled')
          });
        }
        
      });
    }

    TalkeeIM.prototype.isAdminOfPortal =  function(cb) {
      var self = this;
      console.log('portal deleting check started');
      self.getPortalDetails(self._currentPortal,function(data){
        if(data.createdBy == firebase.auth().currentUser.uid){
          cb(true);
        }
        else{
          cb(false);
        }
      })
    }
    

    TalkeeIM.prototype.leaveTheChannel =  function(channelId,cb) {
      var self = this;
      if(self._currentChannel == ''){
        cb(false);
        return;
      }
      var userId = firebase.auth().currentUser.uid;
      var portalId = self._currentPortal;

      self.getChannelDetails(channelId,function(channelData){
        if(channelData.createdBy == userId){
          cb(true); // normally leave 
        }
        else{
          firebase.database().ref('/channel-users/channels/'+channelId+'/'+userId).remove().then(function(){
            firebase.database().ref('/channel-users/users/'+userId+'/'+portalId+'/'+channelId).remove().then(function(){
              self._currentChannel = '';
              cb(true)
            }).catch(function(error) {
              console.error('Error writing Firebase Database', error); 
              cb(false)
            });
          }).catch(function(error) {
            console.error('Error writing Firebase Database', error); 
            cb(false)
          });
        }
      })
            
    }

    
    TalkeeIM.prototype.onMaindDashboardShown =  function() {
      var self = this;
      var userId = self._currentUserId;
      $('.searchChannelOrUsers input').attr('data-search','channel');
      $('.searchChannelOrUsers input').attr('placeholder','Search Channel');    
      $('.searchChannelOrUsers').show();
      $('#active-portal-channels').html('');
      $('#active-portal-channels').show();
      $('.record-trigger').hide();
      
    }
    

    
    // event handlers
    TalkeeIM.prototype.attachEventHandlers = function() {
        var self = this;
        // on startup
        $('.dashboardPage').hide();
        $('.page-container2').height($(window).height()-$('.header-desktop2').height());
        $('.mainDashboardContainer').show(0,self.onMaindDashboardShown());
        $('#page-portal_select, #page-login, .page, .searchChannelOrUsers').hide();

        $('.record-trigger').hide();
        $('.channel-leave-btn').hide();
        $('#now_player_icon').hide();
        $('.requestshandleUItrigger').hide();
        // var breakPointForSmallerDashBoard = 1350+40;
        var breakPointForSmallerDashBoard = 1350;
        if($(window).width()>=breakPointForSmallerDashBoard){
          $('#page-dahsboard').addClass('smallerDashboard');
        }

        



        $(document).on('click', '#sign-out', function(event){
          self.resetActivePortal(function(){
            
            self._currentPortal = '';
            self._currentChannel = '';
            $('.activeChannelName').html('');
            $('.active-channel-users').html('');
        
            self.updateUserStatus('Offline',function(){
              self.signOut();
            });
        
            console.log('sign out ')
          })
          
        });

        $(document).on('click', '#sign-in-withgoogle', function(event){
            self.signIn();           
        });

        $(document).on('submit', '#join-or-create-portal', function(event){
          event.preventDefault();
          var portalText = $(this).find('#createportaltext').val();
          var portalSelected = '';
          if(portalText == ''){
            portalSelected = $('.portallist-holder tr[data-selected="1"]').attr('data-portal-id');
            console.log('portalSelected',portalSelected);
          }
          if((portalText == '') && (portalSelected == undefined)){
            alert('Please enter a portal name or select a portal');
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
            self.createOrJoinPortal(type,textOrId,function(data){
              console.log(data);
              if(data.error == true){
                location.reload();
              }
              else{        
                $('.page').hide();
                self.setActivePortal(data.portalId,function(){
                  self._currentPortal = data.portalId;
                  firebase.database().ref('/users/' + firebase.auth().currentUser.uid).once('value', function(snapshot) {
                    var data = snapshot.val();
                    if(data != null){
                      if(data.onPage == 5){
                        self.showActivePortalDashboard(data,self._currentPortal);
                        // self.onDeletePortal();
                      }
                      else{
                        $('#page-enterusername').show(0,function(){
                          $('.usernametakeinput').focus();
                          self.updateOnPage(3);
                        });
                      }
                    }
                  });
                  
                });      
              }
            })
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
          $('#page-enteravatar').show();
          var name = $('.usernametakeinput').val();
          self.updateUserName(name);
          self.updateOnPage(4);
        });

        $(document).on('click', '.nextodashboard', function(event){
          $('.page').hide();
          self.getUser(function(data){
            console.log(data);
            $('.cuserAvatar').attr('src',data.avatar);
            $('.settingsUsername').html(data.name);
            $('.settingsUserstatus').html(data.status);
            $('#page-dahsboard').show(0,function(){
              $('#regsteps').hide();
            });
          })
          
          self.updateOnPage(5);
        });

        $(document).on('click', '.backtoentername', function(event){
          $('.page').hide();
          $('#page-enterusername').show(0,function(){
            $('.usernametakeinput').focus()
          });
        });

        $(document).on('keyup', '#portal-search', function(event){
          event.preventDefault();
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
          $('.dashboardPage').hide();
          $('.settingsPage').toggle();
          $('.record-trigger').hide();
          self.isAdminOfPortal(function(isAdmin){
            if(isAdmin){
              $('#deletePortal').show();
            }
            else{
              $('#deletePortal').hide();
            }
          })
        });

        $(document).on('click', '.createChannel', function(event){
          $('.dashboardPage').hide();
          $('.createChannelPage').toggle();
        });

        $(document).on('click', '.showmaindashboard', function(event){
          $('.dashboardPage').hide();
          $('.mainDashboardContainer').show(0,self.onMaindDashboardShown());
        });

        $(document).on('click', '.exploreChannels', function(event){
  
          $('.showotherchannelsonportal').val('');
          $('.dashboardPage').hide();
          $('.enterChannelPage .portalchannelsholder').html('');
          $('.enterChannelPage .otheruserschannelonportal').html('');
          
            var portalId = self._currentPortal;
            self._exploreChannelList = new Array();
            self.getChannelsListOnPortal(portalId,function(allChannels){  
              self.getMyChannelsOnPortal(portalId,function(myChannels){
                myChannels.forEach(channelId => {
                  self.getChannelDetails(channelId,function(channelData){
                    self._exploreChannelList.push({cId: channelId, cData: channelData});
                    $('.enterChannelPage .portalchannelsholder').append(`<div class="iconItem activeTheChannel icon-item-yellow" data-id="`+channelId+`" style="">
                    <span class="image iconImage img-cir img-70 cursorPointer centerIconWrap" style=""></span>
                    <span class="iconName" style="">`+channelData.name+`</span>                        
                    </div>`);
                  });
                });
                // other channels of users on this portal 
                console.log('mychannels',myChannels);
                console.log('allChannels',allChannels);
                allChannels.forEach(channelId => {
                  if(!myChannels.includes(channelId)){
                    self.getChannelDetails(channelId,function(channelData){
                      self._exploreChannelList.push({cId: channelId, cData: channelData});                      
        
                      $('.enterChannelPage .otheruserschannelonportal').append(`<div class="iconItem reqtojoinchannel icon-item-yellow" data-id="`+channelId+`" style="">
                      <span class="image iconImage img-cir img-70 cursorPointer centerIconWrap" style=""></span>
                      <span class="iconName" style="">`+channelData.name+`</span>                        
                      </div>`);
        
        
        
                    }); 
                  }
                });
        
              });
              
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
              $('.searchChannelOrUsers input').attr('placeholder','Search Users');
              $('.channel-leave-btn').show();
              //self.subscribeTooChannelRoomMsgs(self._currentChannel,function(){});
              self.subscribeTooChannelNewRoomAddition(self._currentChannel);
            }
          })
          
        });

        $(document).on('click', '.backtomainportal', function(event){
          self._currentChannel = '';
          self.resetActiveChannel(function(){
            $('.activeChannelName').html('');
            $('.addmultiplethings').attr('data-add','user-to-portal');
            $('.active-channel-users').html('').hide();
            $('.searchChannelOrUsers input').attr('data-search','channel');
            $('.searchChannelOrUsers input').attr('placeholder','Search Channel');
            $('.channel-leave-btn').hide();
            $('.activeChannelName ').html('Lobby');
            $('.dashboardPage').hide();
            $('.mainDashboardContainer').show(0,self.onMaindDashboardShown());
          })
          
        });

        $(document).on('click', '.addmultiplethings', function(event){  
          var whatToAdd = $(this).attr('data-add');
          if(whatToAdd == 'user-to-channel'){
            $('.dashboardPage').hide();
            $('.addUserToChannelPage').show();
          }
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
              var container = $('#active-portal-channels')
              setTimeout(function() {
                self.searchChannelsOnPortals(searchText,self._currentPortal,function(foundChannels){
                  console.log(foundChannels);
                  self.getMyChannelsOnPortal(self._currentPortal,function(myChannels){
                    container.html('');
                    foundChannels.forEach(function(channel) {
                    
                      if(myChannels.includes(channel.cId)){
                        var tpl = `
                        <div class="iconItem activeTheChannel icon-item-yellow" data-id="`+channel.cId+`" style="">
                        <span class="image iconImage img-cir img-70 cursorPointer centerIconWrap" style=""></span>
                        <span class="iconName" style="">`+channel.cData.name+`</span>                        
                        </div>
                        `;
                        container.append(tpl);      
                      }
                      else{
                        // otehrs channel
                        var tpl = `
                        <div class="iconItem reqtojoinchannel icon-item-yellow" data-id="`+channel.cId+`" style="">
                        <span class="image iconImage img-cir img-70 cursorPointer centerIconWrap" style=""></span>
                        <span class="iconName" style="">`+channel.cData.name+`</span>                        
                        </div>
                        `;
                        container.append(tpl);      
                      }
                    });
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
              alert('User added to channel successfully');
              if(self._currentChannel != ''){
                self.showUsersOfChannel(self._currentChannel);
              }
            });
          }
        });

        $(document).on('submit', '#userinvitefrom', function(event){
          event.preventDefault();
          var userEmail = $(this).find('#invite-email').val();
          if(userEmail != ''){
            //window.open('mailto:'+userEmail+'?subject=Talkee Invitation&body=Your friend Invited you to <a href="#">talkee</a>');
            console.log(userEmail);
            $(location).attr('href', 'mailto:'+userEmail+'?subject='
                                     + encodeURIComponent("Talkee Invitation")
                                     + "&body=" 
                                     + encodeURIComponent("Your friend Invited you to http://gettalkee.com/new-talkee")
            );
          }
        });

        $(document).on('click', '.requestshandleUItrigger', function(event){  
          $('.dashboardPage').hide();
          $('.requestsPageUI').show();
          self.showRequestsToChannels();
        });

        $(document).on('click', '.activateChatRoom', function(event){  
          // chatbox height fix
          var heights = 75+75+90+30;
          //console.log($('.au-chat__title').height(),$('.header-desktop2').height(),$('.au-chat-textfield').height(),$(window).height());
          $('.au-chat__content').height($(window).height()-heights);
          var chatRoomMember = new Array();
          var toMember = $(this).attr('data-id');
          if(toMember != firebase.auth().currentUser.uid){
            chatRoomMember.push(firebase.auth().currentUser.uid);
            
            chatRoomMember.push(toMember);
            $('.dashboardPage').hide();
            self.activateTheChatRoom({members: chatRoomMember},function(roomId){
              self._activeChatRoomId = roomId;
              self.setActiveChatRoomReciever(toMember);
              $('.chatBox').find('#talkeeChatMainBox').html('');
              $('.chatBox').show(0,function(){
                var element = document.getElementById("talkeeChatMainBox");
                element.scrollTop = element.scrollHeight;
                // We load currently existing chat messages and listen to new ones.
                self.loadMessages(self._activeChatRoomId);
                $('.record-trigger').show();
              });
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
          self.addUserToChannel(requserId,cid,function(){
            alert('User added to channel successfully');
            self.delRequestToChannel(cid,reqForUserId,requserId,function(){
              // deleteed update ui
              curEle.parents('.list-group-item:first').remove();
            });
          });
        });

        $(document).on('click', '.reqtojoinchannel', function(event){
          var cid = $(this).attr('data-id');
          var container = $(this);
          self.addNewRequestToChannel(cid,function(){
            container.remove();
            alert('Request sent successfully');
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
          self.onMessageFormSubmit();
        });

        $(document).on('submit', '#create-channel-form', function(event){
          event.preventDefault();
          var curEle = $(this);
          var portalText = $('#createChanneltext').val();
          if((portalText == '')){
            alert('Please enter a channel name');
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
                  alert('Channel Created Successfully');
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
          event.preventDefault();
          $('#fileUploadCapture').trigger('click');
        });

        $(document).on('click', '.file-downicon', function(event){          
          event.preventDefault();
          self.CustomDownload($(this).attr('data-name'),$(this).attr('data-src'));
        });

        

        var isMobile = false; //initiate as false
// device detection
if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) { 
    isMobile = true;
}
        if(isMobile){
          $(document).on('touchend', '.record-trigger', function(event){
            if(self._activeChatRoomId == ''){
              return false;
            }
            var recordingState = $(this).attr('data-recording');       
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
                title: '0 second',
                trigger: 'manual'
              });
              self.recordCounter(1000,$(this));
              self.startRecording();
            }
          });

          
        }
        else{
          $(document).on('mouseup', '.record-trigger', function(event){
            if(self._activeChatRoomId == ''){
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
                title: '0 second',
                trigger: 'manual'
              });
              self.recordCounter(1000,$(this));
              self.startRecording();
            }
          });

        }

        $(document).on('click', '.sound-button', function(event){          
          var state = $(this).attr('data-volume');
          state = (state == 'On')? 'Off': 'On';
          self.updateVolume(state,function(){}); 
          var ele = $('#talkeeChatMainBox').find('.audioele');
          var volume = (state == 'On')? 1: 0;
          if(volume == 0){
            ele.removeAttr('muted');
          }
          ele.prop("volume", volume);    
        });

        $(document).on('click', '.autoplay-button', function(event){
          // $('.sound-button').attr('data-volume',volume);
          // $('.autoplay-button').attr('data-autoplay',autoplay);
          var state = $(this).attr('data-autoplay');
          state = (state == 'On')? 'Off': 'On';
          self.updateAutoplay(state,function(){});
          
        });

        $(document).on('click', '#deletePortal', function(event){
          self.DeletePortal(self._currentPortal,function(){});
          
        });
        

        $(document).on('click', '.channel-leave-btn', function(event){
          var curEle = $(this);
          self.leaveTheChannel(self._currentChannel,function(result){
            if(result){
              curEle.hide();
              $('.backtomainportal').trigger('click');
            }
          });          
        });
        
        window.onerror = function(msg, url, linenumber) {
          alert('Error message: '+msg+'\nURL: '+url+'\nLine Number: '+linenumber);
          return true;
        }
        
    }





    var config = {
        apiKey: "AIzaSyBneVFGGxyB8oo_sdYDOdEgLsyxAzgX9Nk",
        authDomain: "talkee-d4100.firebaseapp.com",
        databaseURL: "https://talkee-d4100.firebaseio.com",
        projectId: "talkee-d4100",
        storageBucket: "talkee-d4100.appspot.com",
        messagingSenderId: "708610098712"
      };
    firebase.initializeApp(config);
    
    var fireBaseRef = firebase.database().ref(); 

    var talkeeApp = new TalkeeIM(fireBaseRef,{});

})();