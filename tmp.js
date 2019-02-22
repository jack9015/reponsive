self.getChannelsListOnPortal(portalId,function(allChannels){  

});




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
  var callback2 = function(snap) {
    console.log('last callback working...');
    self.autoplayLastAudio();

  };
  firebase.database().ref('/messages/'+self._activeChatRoomId).limitToLast(1).on('child_added', callback2);
  firebase.database().ref('/messages/'+self._activeChatRoomId).limitToLast(1).on('child_changed', callback2);
  
}





firebase.database().ref('/channel-users/channels/'+channelId+'/'+userId).remove();
firebase.database().ref('/channel-users/users/'+userId+'/'+portalId+'/'+channelId).remove();




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
  var messageElement = $('#talkeeChatMainBox');

  self.getRequestsDetails(userId,function(reqData){
    var reqCount = 0;
    if(reqData.val() !=null){
      reqData.forEach(function(reqChildSnapshot) {
        reqCount++;          
      });
    }
    if(reqCount>0){
      $('.requestshandleUItrigger').show();
    }
    else{
      $('.requestshandleUItrigger').hide();
    }

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
      
      if(self._currentChannel != ''){
        self.showUsersOfChannel(self._currentChannel);
        $('.active-channel-users-search').show();
        $('.channel-leave-btn').show();
        self.subscribeTooChannelRoomMsgs(self._currentChannel,function(){});
      }
    })
    
  });
  var state = $(this).attr('data-volume');
          state = (state == 'On')? 'Off': 'On';
          self.updateVolume(state,function(){}); 
          var ele = $('#talkeeChatMainBox').find('.audioele');
          var volume = (state == 'On')? 1: 0;
          if(volume == 0){
            ele.removeAttr('muted');
          }
          ele.prop("volume", volume);    

          if(self._currentChannel == ''){
            $('.searchChannelOrUsers input').attr('data-search','channel');
            $('.searchChannelOrUsers input').attr('placeholder','Search Channel');  
          }
          $('.searchChannelOrUsers input').attr('data-search','users');
          $('.searchChannelOrUsers input').attr('placeholder','Search Users');

          firebase.auth().currentUser.uid

          arr = _.reject(arr, function(d){ return d.id === 3; });

          self.getChannelUsers(cid,function(members){
            self.getUserDetails(requserId,function(userData){
              self.getChannelDetails(cid,function(channelData){
                /* members = _.reject(members, function(d){ return d === requserId; });
                members = _.reject(members, function(d){ return d === firebase.auth().currentUser.uid; }); */
                if(members.length>0){
                  var notiMsg = userData.data.name+' joined the channel " '+channelData.name+'"';
                  self.addUsersNotifcation(members,notiMsg);
                }
              });                
            });              
          })

          self.showNotifcation('Please enter a channel name',function(){});

          listenUserNotification
          TalkeeIM.prototype.showNotifcation 


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

          2764

          self.addUserToChannel(requserId,cid,function(){
            self.getChannelUsers(cid,function(members){              
                self.getChannelDetails(cid,function(channelData){
                  members = _.reject(members, function(d){ return d === requserId; });                  
                  if(members.length>0){
                    var notiMsg = userData.data.name+' joined the channel " '+channelData.name+'"';
                    self.addUsersNotifcation(members,notiMsg);
                  }
                });     
            })            
          });


          self.getChannelDetails(channelId,function(channelData){
            if(channelData.createdBy == firebase.auth().currentUser.uid){
              $('.channel-delete-btn').show();
            }
            else{
              $('.channel-delete-btn').hide();
            }
          })


          TalkeeIM.prototype.addUserToChannel

          // reqtojoinchannel
          // activeTheChannel createChannel

          $(this).find('.iconImage').removeClass('notification-status');

          // users channel list return only one channel or no channel

          //get channel user list if user in activate the channel else is the channel in users channel list then also acti
          
          $('.autoplay-button').attr('data-autoplay',autoplay);
          if(autoplay == 'On')
          $('.autoplay-button').find('.fa').removeClass('dim-btn');
          else
          $('.autoplay-button').find('.fa').addClass('dim-btn');

          self.showNotifcation('Autoplay turned '+autoplay+msgonMobile,function(){});
          var msgonMobile = ((self.isMobile) && (autoplay == 'On'))? ' (Device will stay awake)': '';