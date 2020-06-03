function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


function confirmScrim(message){
	database.ref(message.id+'/confirmation').set('open')
	database.ref(message.id).once('value').then(snap => {
		var card = new Discord.MessageEmbed()
			.setColor('#0099ff')
			.setTitle('New scrim created')
			.setDescription("There is a new scrim @everyone, check it out!")
			.addFields(
				{name: 'Date', value: snap.val().date},
				{name: 'Time', value: snap.val().time+' utc'},
				{name: 'Players', value: userString(snap.val().users,message.guild,[])},
				{name: 'Confirmation period', value: 'open'},
				{name: 'Posible actions', value: calcActivation('open')}
			)
			.setFooter("Scrim created by "+message.guild.members.cache.get(snap.val().author).displayName)
		message.edit(card)
		message.react('👌')
		if (snap.val().users!= null){
			for (u of snap.val().users){
				message.guild.members.cache.get(u).send("The confirmation period for the scrim you signed up for is now open! Remember to confirm your assistance or you wont be on the players list for the scrim")
			}
		}
		console.log("A scrim enter confirmation mode")
	})
}


function activateScrim(message){
	database.ref(message.id).once('value').then(function(snap){
		if (snap.exists()){
			var desc=""
			if (snap.val().users!=null){
				for (u of snap.val().users){
					desc+="<@!"+u+">"
				}
			}
			var players=[]
			if (snap.val().confirmed!=null)		players=snap.val().confirmed.splice(0,8)
			console.log(players)
			var team1=shuffle(players.slice())
			var team2=team1.splice(0,team1.length/2)
			console.log(team1)
			console.log(team2)
			var others=[]
			if (snap.val().users!=null){
				for (u of snap.val().users){
					if (!players.includes(u))	others.push(u)
				}
			}
			var host = chooseHost(players, message.guild)
			var maps = shuffle(["Urban", "Woods", "Meltdown"])
			maps = maps[0]+'\n'+maps[1]+'\n'+maps[2]
			
			if (host[0]!=null){
				message.guild.members.cache.get(host[0]).send("I've given you @ScrimHost role, so you should be able to post any necesary message on #scrim-official\nAs you'll be hosting this scrim, you need to do the following:\n\tDo any necesary changes on the teams, and post them on scrim-official if you change them\n\tCreate a lobby for the scrim, and use the command \"/ts 0\" (type it on chat)\n\tPost the lobby's name and password over at #scrim-official, and tell peole to join\n\tOnce teams are done, use \"/ts 1\" to set things back to normal, and enjoy your scrim\nPlease, try to delete your messages on #scrim-official when the scrim ends so we keep the channel clean")
			}
			
			var card = new Discord.MessageEmbed()
				.setColor('#ff4500')
				.setTitle('Scrim time!')
				.setDescription("Scrim has been activated, are you ready to play?")
				.addFields(
					{name: 'Rules', value: "Follow host command, dont make decisions on your own\nIn case of doubt, whatever is posted on scrim-official is law\nUse #scrim-channel to talk to other members of the scrim, including the host\nGuns allowed ar displayed at #Scrim-Rules"},
					{name: 'Host', value: host[1]},
					{name: 'Maps', value: maps},
					{name: 'Team 1', value: showPlayers(team1,message.guild)},
					{name: 'Team 2', value: showPlayers(team2,message.guild)},
					{name: 'Reserve', value: showPlayers(others,message.guild)}
				)
				.setFooter("Scrim created by "+message.guild.members.cache.get(snap.val().author).displayName)
				
			message.channel.send(desc).then(msg => {
				msg.edit(card)
				message.delete()
				database.ref(message.id).set({})
				var deletion =scheduler.scheduleJob(Date.now()+90*60000,function(msg,users,guild,host){
					deleteScrim(msg,users,guild,host)
				}.bind(null,msg,snap.val().users,message.guild, host[0]))
				for (j of jobs){
					if (j[0]==message.id){
						j[3]=deletion
						break
					}
				}
				var hostrole = message.guild.roles.cache.find(u => u.name=='ScrimHost')
				if (host[0]!=null)	message.guild.members.cache.get(host[0]).roles.add(hostrole)
			})
		}
		console.log("A scrim was activated")
	})
}

function deleteScrim(msg, users, guild, host){
	for (var i=0; i<jobs.length; i++){
		var j=jobs[i]
		if (j[0]==msg.id){
			if (j[1] != null)	j[1].cancel()
			if (j[2] != null)	j[2].cancel()
			if (j[3] != null)	j[3].cancel()
			jobs.splice(i,1)
			break
		}
	}
	var participant = guild.roles.cache.find(u => u.name=='ScrimParticipant')
	var hostrole = guild.roles.cache.find(u => u.name=='ScrimHost')
	if (users!=null){
		database.ref('info').once('value').then(snap => {
			snap.forEach(child => {
				if (users.includes(child.key)){
					if (child.val().participations<2)	guild.members.cache.get(child.key).roles.remove(participant)
					database.ref('info/'+child.key+'/participations').set(child.val().participations-1)
				}
			})
		})
	}
	if (host!=null)	guild.members.cache.get(host).roles.remove(hostrole)
}


function chooseHost(players, guild){
	if (players == null || players.length==0)	return [null,"None"]
	var host = [players[0],guild.members.cache.get(players[0]).displayName]
	for (p of players){
		a = guild.members.cache.get(p).roles.cache.array().find(r => r.name == "LaGmin");
		if (p=="690593135151022130" || a!=undefined){
			host = [p,guild.members.cache.get(p).displayName]
			break;
		}
	}
	return host	
}

function showPlayers(pl,guild){
	if (pl == null || pl.length==0)	return "None"
	s=guild.members.cache.get(pl[0]).displayName
	for (var i=1; i<pl.length; i++){
		s+='\n'+guild.members.cache.get(pl[i]).displayName
	}
	return s
}


function userString(users,guild,confirmed){
	if (users == null || users.length==0)	return "None"
	s=""
	if (confirmed != null && confirmed.includes(users[0]))	s+=':white_check_mark: '+guild.members.cache.get(users[0]).displayName
	else s+=guild.members.cache.get(users[0]).displayName
	for (u of users.splice(1)){
		if (confirmed != null && confirmed.includes(u))	s+='\n:white_check_mark: '+guild.members.cache.get(u).displayName
		else 	s+='\n'+guild.members.cache.get(u).displayName
		
	}
	return s
}


function calcActivation(string){
	if (string=='closed'){
		return 'React :thumbsup: to join the scrim\nReact :alarm_clock: to see your local time for the scrim\nRemove your reaction to undo the thing'
	}
	return 'React :thumbsup: to join the scrim\nReact :alarm_clock: to see your local time for the scrim\nReact :ok_hand: to confirm your assistance\nRemove your reaction to undo the thing'
}


function edit(users, guild, confirmed, snap, packet){
	var card = new Discord.MessageEmbed()
		.setColor('#0099ff')
		.setTitle('New scrim created')
		.setDescription("There is a new scrim @everyone, check it out!")
		.addFields(
			{name: 'Date', value: snap.val().date},
			{name: 'Time', value: snap.val().time+' utc'},
			{name: 'Players', value: userString(users,guild,confirmed)},
			{name: 'Confirmation period', value: snap.val().confirmation},
			{name: 'Posible actions', value: calcActivation(snap.val().confirmation)}
		)
		.setFooter("Scrim created by "+bot.guilds.cache.get(packet.d.guild_id).members.cache.get(snap.val().author).displayName)

	bot.channels.cache.get(packet.d.channel_id).messages.fetch(packet.d.message_id).then(msg => {
		msg.edit(card)
	})
}

function formated(s){
	return s.length==16 && s[2]=='/' && s[5]=='/' && s[10]==' ' && s[13]==':' 
}


require('dotenv').config()
var admin = require('firebase-admin')
var serviceAccount = require('./scrimbot-7ed35-firebase-adminsdk.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://scrimbot-7ed35.firebaseio.com"
})
var database = admin.database()
var Discord = require('discord.js')
var scheduler = require('node-schedule')
var fs = require('fs')
var jobs = []
var hosts = []
var bot = new Discord.Client()

bot.login(process.env.TOKEN)

bot.on('ready', () => {
	console.log(bot.user.username+" is up and running")
	database.ref().once('value').then(function(snap){
		if (snap.exists()){
			snap.forEach(function(child){
				if (child.key!='info'){
					var fecha = child.val().date.split('/');
					var hora = child.val().time.split(':');
					var date = Date.UTC(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0);
					if (date > Date.now()){
//		/*Main read*/				bot.channels.cache.get('716689384602206238').messages.fetch(child.key).then(message =>{
		/*Test read*/				bot.channels.cache.get('716586938030751745').messages.fetch(child.key).then(message =>{
							var activacion = scheduler.scheduleJob(date,function(message){
								activateScrim(message)
							}.bind(null,message))
							var confirmacion = scheduler.scheduleJob(date-1*60000,function(message){
								confirmScrim(message)
							}.bind(null,message))
							jobs.push([message.id,activacion,confirmacion, null])
							console.log("Jobs for scrim "+message.id+" created")
						})
					}
				}
			})
		}	
	})

})


bot.on('message', msg => {

	if (msg.author.id != bot.user.id){
		if (msg.channel.type=='dm'){
			if (formated(msg.content)){
				var args = msg.content.split(' ')
				var fecha = args[0].split('/')
				var hora = args[1].split(':')
				var date = Date.UTC(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0)
				database.ref('info/'+msg.author.id+'/time').set(Math.round((date-Date.now())/600000)*10)
				msg.channel.send("Your timezone settings have been configured. You can go back and ask for your local time again, this time it will work")
				console.log("Timezone of user "+msg.author.id+" was set")
			} else {
				msg.channel.send("Are you trying to change your timezone settings? I could't recognice the format you used")
			}
			
		
		} else if (msg.channel.name == 'scrim-official' || msg.channel.name == 'scram') {
			if (msg.content.substring(0,13)=="!scrim create"){
				var args = msg.content.split(' ').splice(2)
				var fecha = args[0].split('/')
				var hora = args[1].split(':')
				var date = Date.UTC(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0)
				if (date > Date.now()+1*60000){
							
					msg.delete()
					var card = new Discord.MessageEmbed()
						.setColor('#0099ff')
						.setTitle('New scrim created')
						.setDescription("There is a new scrim @everyone, check it out!")
						.addFields(
							{name: 'Date', value: args[0]},
							{name: 'Time', value: args[1]+' utc'},
							{name: 'Players', value: 'None'},
							{name: 'Confirmation period', value: 'closed'},
							{name: 'Posible actions', value: 'React :thumbsup: to join the scrim\nReact :alarm_clock: to see your local time for the scrim\nRemove your reaction to undo the thing'}
						)
						.setFooter("Scrim created by "+msg.guild.members.cache.get(msg.author.id).displayName)
						
					msg.channel.send("@everyone").then(message => {
						message.edit(card)
						message.react('👍')
						message.react('⏰')
						database.ref(message.id).set({
							date: args[0],
							time: args[1],
							author: msg.author.id,
							confirmation: 'closed'
						})
						
						var activacion = scheduler.scheduleJob(date,function(message){
							activateScrim(message)
						}.bind(null,message))
						var confirmacion = scheduler.scheduleJob(date-15*60000,function(message){
							confirmScrim(message)
						}.bind(null,message))
						jobs.push([message.id,activacion,confirmacion, null])
						console.log("A scrim was created")
					})
				}
			} else if (msg.content.substring(0,13)=="!scrim delete"){
				var args = msg.content.split(' ').splice(2)
				database.ref(args[0]).once('value').then(snap => {
					if (snap.exists()){
						bot.channels.cache.get(msg.channel.id).messages.fetch(args[0]).then(mes => {
							deleteScrim(mes, snap.val().users, mes.guild, null)
							msg.delete()
							database.ref(args[0]).set({})
							console.log("A scrim was deleted")
						})
					}
				})
			} else if (msg.content.substring(0,17)=="!scrim reschedule"){
				var args = msg.content.split(' ').splice(2)
				if (args.length==3){
					var fecha = args[1].split('/')
					var hora = args[2].split(':')
					var date = Date.UTC(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0)
					if (date > Date.now()+1*60000){
						database.ref(args[0]).once('value').then(function(snap){
							if (snap.exists()){
								var users = snap.val().users
								var confirmed = snap.val().confirmed
								
								var guild = msg.guild
								var card = new Discord.MessageEmbed()
									.setColor('#0099ff')
									.setTitle('New scrim created')
									.setDescription("There is a new scrim @everyone, check it out!")
									.addFields(
										{name: 'Date', value: args[1]},
										{name: 'Time', value: args[2]+' utc'},
										{name: 'Players', value: userString(users,guild,confirmed)},
										{name: 'Confirmation period', value: snap.val().confirmation},
										{name: 'Posible actions', value: calcActivation(snap.val().confirmation)}
									)
									.setFooter("Scrim created by "+guild.members.cache.get(snap.val().author).displayName)

								msg.channel.messages.fetch(args[0]).then(mes => {
									mes.edit(card)
									database.ref(mes.id+'/date').set(args[1])
									database.ref(mes.id+'/time').set(args[2])
									for (var i=0; i<jobs.length; i++){
										if (jobs[i][0] == args[0]){
											jobs[i][1].cancel();
											if (jobs[i][2] != null)	jobs[i][2].cancel();
											if (jobs[i][3] != null)	jobs[i][2].cancel();
											jobs.splice(i,1);
											break;
										}
									}
									var activacion = scheduler.scheduleJob(date,function(message){
										activateScrim(message)
									}.bind(null,mes))
									var confirmacion = scheduler.scheduleJob(date-1*60000,function(message){
										confirmScrim(message)
									}.bind(null,mes))
									jobs.push([mes.id,activacion,confirmacion, null])
									console.log("A scrim was rescheduled")
									msg.delete()
								})
							}
						})
					}
				}
			}
			
		}
	}
	
})

bot.on("raw", packet =>{

	if (packet.t == 'MESSAGE_REACTION_ADD' && packet.d.user_id!='710859802170884227' && (packet.d.channel_id=='716689384602206238' || packet.d.channel_id=='716586938030751745')){

		switch (packet.d.emoji.name){
		
			case '👍':
				database.ref(packet.d.message_id).once('value').then(function(snap){
					if (snap.exists()){
						var users=snap.val().users
						var confirmed=snap.val().confirmed
						var guild = bot.guilds.cache.get(packet.d.guild_id)
						if (users == null)	users = []
						if (confirmed == null)	confirmed = []
						if (!users.includes(packet.d.user_id)){
							users.push(packet.d.user_id)
							database.ref(packet.d.message_id+'/users').set(users)
						}
						edit(users, guild, confirmed, snap, packet)
					}
				})
				var participant = bot.guilds.cache.get(packet.d.guild_id).roles.cache.find(u => u.name=='ScrimParticipant')
				bot.guilds.cache.get(packet.d.guild_id).members.cache.get(packet.d.user_id).roles.add(participant)
				database.ref('info/'+packet.d.user_id+'/participations').once('value').then(snap => {
					if (snap.exists()){
						database.ref('info/'+packet.d.user_id+'/participations').set(snap.val()+1)
					} else {
						database.ref('info/'+packet.d.user_id+'/participations').set(1)
					}
				})
				console.log("User "+packet.d.user_id+" joined a scrim")
				break
				
			case '👌':
				database.ref(packet.d.message_id).once('value').then(function(snap){
					if (snap.exists() && snap.val().confirmation == 'open'){
						var users=snap.val().users
						var confirmed=snap.val().confirmed
						var guild = bot.guilds.cache.get(packet.d.guild_id)
						if (users == null)	users = []
						if (confirmed == null)	confirmed = []
						if (users.includes(packet.d.user_id) && !confirmed.includes(packet.d.user_id)){
							confirmed.push(packet.d.user_id)
							database.ref(packet.d.message_id+'/confirmed').set(confirmed)
						}
						edit(users, guild, confirmed, snap, packet)
						console.log("User "+packet.d.user_id+" confirmed for a scrim")
					}
				})
				break
				
			case '⏰':
				database.ref('info/'+packet.d.user_id+'/time').once('value').then(function(snap){
					if (snap.exists()){
						database.ref(packet.d.message_id).once('value').then( snap2 => {
							var fecha = snap2.val().date.split('/')
							var hora = snap2.val().time.split(':')
							var date = new Date(Date.UTC(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0)+snap.val()*60000)
							bot.guilds.cache.get(packet.d.guild_id).members.cache.get(packet.d.user_id).user.send("This is the date and time from the scrim in your country\n\t"+String(date.getUTCDate()).padStart(2,'0')+'/'+String(date.getUTCMonth()+1).padStart(2,'0')+'/'+date.getUTCFullYear()+'\t'+String(date.getUTCHours()).padStart(2,'0')+':'+String(date.getUTCMinutes()).padStart(2,'0'))
						})					
					} else {
						bot.guilds.cache.get(packet.d.guild_id).members.cache.get(packet.d.user_id).user.send(
							"I'm sorry, but your timezone data is not on my database. To configure it, just tell me what is your current time (follow this syntax: dd/mm/yyyy hh:mm, time in 24h format please)"
						)
					}
					console.log("User "+packet.d.user_id+" asked to see local time")
				})
				break
				
		}
	}
	
	if (packet.t == 'MESSAGE_REACTION_REMOVE' && packet.d.user_id!='710859802170884227' && (packet.d.channel_id=='716689384602206238' || packet.d.channel_id=='716586938030751745')){

		switch (packet.d.emoji.name){
		
			case '👍':
				database.ref(packet.d.message_id).once('value').then(function(snap){
					if (snap.exists()){
						var users=snap.val().users
						var confirmed=snap.val().confirmed
						var guild = bot.guilds.cache.get(packet.d.guild_id)
						if (users == null)	users = []
						if (confirmed == null)	confirmed = []
						if (users.includes(packet.d.user_id)){
							users=users.filter((u,a,b) => u!=packet.d.user_id)
							confirmed=confirmed.filter((u,a,b) => u!=packet.d.user_id)
							database.ref(packet.d.message_id+'/users').set(users)
							database.ref(packet.d.message_id+'/confirmed').set(confirmed)
						}
						edit(users, guild, confirmed, snap, packet)
						console.log("User "+packet.d.user_id+" left a scrim")
					}
				})

				var participant = bot.guilds.cache.get(packet.d.guild_id).roles.cache.find(u => u.name=='ScrimParticipant')
				database.ref('info/'+packet.d.user_id+'/participations').once('value').then(snap => {
					if (snap.val()<2)	bot.guilds.cache.get(packet.d.guild_id).members.cache.get(packet.d.user_id).roles.remove(participant)
					database.ref('info/'+packet.d.user_id+'/participations').set(snap.val()-1)
				})
				break
				
			case '👌':
				database.ref(packet.d.message_id).once('value').then(function(snap){
					if (snap.exists() && snap.val().confirmation == 'open'){
						var users=snap.val().users
						var confirmed=snap.val().confirmed
						var guild = bot.guilds.cache.get(packet.d.guild_id)
						if (users == null)	users = []
						if (confirmed == null)	confirmed = []
						if (users.includes(packet.d.user_id) && confirmed.includes(packet.d.user_id)){
							confirmed=confirmed.filter((u,a,b) => u!=packet.d.user_id)
							database.ref(packet.d.message_id+'/confirmed').set(confirmed)
						}
						edit(users, guild, confirmed, snap, packet)
						console.log("User "+packet.d.user_id+" unconfirmed for a scrim")
					}
				})
				break
				
		}
	}



})

