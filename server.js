function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function activateScrim(id, channel, guild){
	database.ref(id).once('value').then(function(snap){
		if (snap.exists()){
			database.ref(id+'/confirmed').once('value').then(function(snap){
				if (snap.exists()){
					waiters = snap.val();
					players = waiters.splice(0,8);
					var host = players[0];
					var ma = 0;
					for (user of players){
						if (getRole(user,guild) > ma){
							host = user;
							ma = getRole(user,guild);
						}
					}
					mes = "It's scrim time! Oh my god, I'm so nervous, who will win?";
					mes += "\n\nI've sent a DM to <@!"+host+">, who will be hosting the scrim, telling him how to proceed. Please wait for his instructions, he'll tell you what to do.\nIf any problem raises, he'll tell you how to solve it, as he is on charge for this scrim.";
					
					guild.members.cache.get(host).send("Hey, nice to see you.\nYou'll be hosting the scrim so you'll need to make lobbies, decide teams, and keep people in orden (I know, it'll be hard haha).\n\nYou'll need to make a new lobby for each round of the scrim, check which maps you'll be playing each round on LaG server message.\nUsually we use LaG Scrim for the name of the lobby, and feel free to choose the passsword you like.\nAlso it'd be nice if you set the number of players to 14, in case anyone wants to join and spectate the scrim.\n\nNow to the difficult part:\nOnce you've created the lobby, deploy and type in chat \"/ts 0\", that will stop time so you can make the teams with no rush.\n\nOnce you've typed the command \"/ts 0\", you can tell people the name and password for the lobby and ask them to join you.\nAnd once the teams are all ready, you type the command \"/ts 1\" to set time back to normal and start playing.\n\nRemember, you are on charge here, so if any problem rises, you'll be the one solving it. But I'm sure you'll have no problem :)\n\nOh, and one last thing. Please have a look at the teams, and decide if they're fine or not. If you like them, let everyone know by saying \"We'll run with those teams\" or something like that, and if not, decide new teams over at #LaGChat and post them on #Scrims once you've decided.\n\nOkey, I think that's all, have fun!"); 
					
					var maps = shuffle(["Urban", "Woods", "Meltdown"]);
					mes += "\n\nI hope you've trained hard, because here are the maps you'll be playing on:\n\tRound 1: "+maps[0]+"\n\tRound 2: "+maps[1]+"\n\tRound 3: "+maps[2]+"\n\n";
					
					var team2 = shuffle(players);
					var team1 = team2.splice(team2.length/2);
					mes += "I've made random teams, but i don't know if they're balanced:\n\tTeam 1: ";
					for (var i=0; i<team1.length; i++){
						mes += "<@!"+team1[i]+">  ";
					}
					mes += "\n\tTeam 2: ";
					for (var i=0; i<team2.length; i++){
						mes += "<@!"+team2[i]+">  ";
					}
					mes += "\nHost will decide if these teams are fine, and propose new ones over at #LaGChat if they're not. Remember, for any discussion about teams use #LaGChat, only <@!"+host+"> is allow to post here.\n";
					
					mes += "\nWell, enough of telling you what to do. Go out there and have fun, my brave girls and boys.\nMake LaG proud of you!";
					
					channel.send(mes);
					hosts.push(host);
					scheduler.scheduleJob(Date.now()+60*60000,function(id){
						removeHost(id);
						}.bind(null,host));
				} else {
					channel.send("You told me a scrim was happening today, but none of you lazy asses confirmed you'll be playing! I swear if I had arms, I'd puch you in the face right now");
				}
				database.ref(id).set({});
				for (var i=0; i<jobs.length; i++){
					if (jobs[i][0] == id){
						jobs[i][1].cancel();
						if (jobs[i][2] != null)	jobs[i][2].cancel();
						jobs.splice(i,1);
						break;
					}
				}		
			});
		} else {
			channel.send("There was a scrim supossed to happen now, but I've lost its data. Ups. <@!690593135151022130> please fix.");
		}
	});
	return;
}

function confirmScrim(id, channel){
	database.ref(id).once('value').then(function(snap){
		if (snap.exists()){
			database.ref(id+'/users').once('value').then(function(snap){
				if (snap.exists()){
					mes = "";
					for (user of snap.val()){
						mes += " <@!"+user+">";
					}
					mes += "\nSup, people. Your scrim is starting in 15 minutes. Please confirm me you'll be playing, so I can decide on teams and such. You can confirm by typing:\n\t!scrim confirm "+id;
					channel.send(mes);
				} else {
					channel.send("Lmao there is a scrim in 15 min but nobody has signed up. Are you guys that lame, for real?\nAnyway, in case you want to join...\n\t!scrim join "+id+"\nAndo dont forget to confirm by typing\n\t!scrim confirm "+id);
				}
			});
		} else {
			channel.send("There was a scrim supossed to happen in 15 min, but I've lost its data. Ups. <@!690593135151022130> please fix.");
		}
	});
	return;
}

function getRole(user,guild){
	a = guild.members.cache.get(user).roles.cache.array().find(r => r.name == "LaGmin");
	if (user == "690593135151022130")	return 2;
	if (a != undefined)	return 1;
	return 0;
}

function removeHost(user){
	for (var i=0; i<hosts.length; i++){
		if ( hosts[i] == user ){
			hosts.splice(i,1);
			break;
		}
	}
}


require('dotenv').config();
var admin = require('firebase-admin');
var serviceAccount = require('./scrimbot-7ed35-firebase-adminsdk.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://scrimbot-7ed35.firebaseio.com"
});
var database = admin.database();
var Discord = require('discord.js');
var scheduler = require('node-schedule');
var fs = require('fs');
var jobs = []
var hosts = []
var bot = new Discord.Client();

bot.login(process.env.TOKEN);

bot.on('ready', () => {
	console.log(bot.user.username+" is up and running");
	
	database.ref().once('value').then(function(snap){
		if (snap.exists()){
			snap.forEach(function(child){
				var val = child.val();
				var fecha = val.date.split('/');
				var hora = val.time.split(':');
				var date = Date.UTC(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0);
				if (date > Date.now()){
					/*  Main code  */
					var job1 = scheduler.scheduleJob(date,function(id,channel){
						activateScrim(id,channel,guild);
						}.bind(null,child.key,bot.channels.cache.get('705850717218406420'),bot.guilds.cache.get('695900254733729903')));
					var job2 = scheduler.scheduleJob(date-15*60000,function(id,channel){
						confirmScrim(id,channel);
						}.bind(null,child.key,bot.channels.cache.get('705850717218406420')));
					/*  Testing code  */
//					var job1 = scheduler.scheduleJob(date,function(id,channel,guild){
//						activateScrim(id,channel,guild);
//						}.bind(null,child.key,bot.channels.cache.get('711680341550694471'),bot.guilds.cache.get("695900254733729903")));
//					var job2 = scheduler.scheduleJob(date-15*60000,function(id,channel){
//						confirmScrim(id,channel);
//						}.bind(null,child.key,bot.channels.cache.get('711680341550694471')));
					jobs.push([child.key,job1,job2]);
				}
			});
			console.log(jobs.length+"/"+snap.numChildren()+" jobs were succesfully reschedulled");
		} else {
			console.log("No jobs to reschedulle");
		}
		console.log();
	});
});


bot.on('message', msg => {

	if (msg.channel.name == 'scrim') {
		
		if (msg.content.substring(0, 7) == '!scrim '){

			var args = msg.content.split(" ");
			var cmd = args[1];
			args = args.splice(2);
			switch(cmd) {
			
				case 'create':
					if (args.length != 2 ){
						msg.channel.send("You need to specify the date and time of the scrim\n\t!scrim create [date] [time]\nRemember, time follows UTC standard");
						break;
					}
					if ( getRole(msg.author.id,msg.guild) == 0 ){
						msg.channel.send("You don't have the privileges to do this. Only @LaGmin or @[LaG]FairyPrincess can create a new scrim");
						break;
					}
					database.ref().once('value').then(function(snap){
						var json = snap.toJSON()
						var id = 0;
						while (json != null && json[id] != undefined)	id++;
						var fecha = args[0].split('/');
						var hora = args[1].split(':');
						var date = Date.UTC(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0);
						if (date > Date.now()+15*60000){
							database.ref(id).set({
								date: args[0],
								time: args[1]
							});
							var job1 = scheduler.scheduleJob(date,function(id, channel, guild){
								activateScrim(id,channel,guild);
								}.bind(null,id, msg.channel, msg.guild));
							var job2 = scheduler.scheduleJob(date-15*60000,function(id, channel){
								confirmScrim(id,channel);
								}.bind(null,id, msg.channel));
							jobs.push([id,job1,job2]);
							msg.channel.send("A new scrim has been created, check it out!\n\tID: "+id+"\tDATE: "+args[0]+"\tTIME: "+args[1]+"\nBe fast and join now @everyone, because there is an 8 player limit. Join yourself by typing:\n\t!scrim join "+id);
						} else {
							msg.channel.send("Scrim creation needs a 15 minute margin, please choose a date further in the future");
						}
					});
					break;
					
					
				case 'destroy':
					if (args.length != 1 ){
						msg.channel.send("You need to specify which scrim to eliminate\n\t!scrim destroy [id]\nRemember, time follows UTC standard");
						break;
					}
					if ( getRole(msg.author.id,msg) == 0 ){
						msg.channel.send("You don't have the privileges to do this. Only @LaGmin or @[LaG]FairyPrincess can destroy a scrim");
						break;
					}
					database.ref(args[0]).once('value').then(function(snap){
						if (snap.exists()){
							database.ref(args[0]).set({});
							for (var i=0; i<jobs.length; i++){
								if (jobs[i][0] == args[0]){
									jobs[i][1].cancel();
									if (jobs[i][2] != null)	jobs[i][2].cancel();
									jobs.splice(i,1);
									break;
								}
							}
							//////////////////////////
						} else {
							msg.channel.send("There is no scrim "+args[0]+". Check the current scrim list by typing\n\t!scrim see");
						}
					});
					break;
						
						
				case 'join':
					if (args.length != 1 ){
						msg.channel.send("You need to specify which scrim you want to join, like this:\n\t!scrim join [id]\nTo know the id for your desired scrim, use:\n\t!scrim see");
						break;
					}
					database.ref(args[0]).once('value').then(function(snap){
						if (snap.exists()){
							database.ref(args[0]+'/users').once('value').then(function(snap){
								var users = snap.val();
								if (users == null)	users = [];
								if (users.includes(msg.author.id)){
									msg.channel.send("Don't be greedy, you were already in this scrim!");
								} else  {
									users.push(msg.author.id);
									database.ref(args[0]+'/users').set(users);
									if (users.length > 8){
										msg.channel.send("As this scrim has already 8 people playing, I've put you in the waiting list. In case anyone leaves, or they dont confirm their assistance, i'll make sure to move you to the main list.\nYou still need to confirm your assistance anyway 15 min before scrim starts by typing\n\t!scrim confirm "+args[0]+"\n(Don't worry, I'll ping you 15 min before the scrim in case you forget)");
									} else {
										mes = "Congratulations! You've joined this scrim. These are the participants for scrim "+args[0]+":\n";
										for (user of users){
											mes += "\t"+msg.guild.members.cache.get(user).displayName+"\n"
										}
										mes += "Remember you still need to confirm your assistance 15 min before scrim starts by typing\n\t!scrim confirm "+args[0]+"\n(Don't worry, I'll ping you 15 min before the scrim in case you forget)";
										msg.channel.send(mes);
									}
								}
							});
						} else {
							msg.channel.send("There is no scrim "+args[0]+". Check the current scrim list by typing\n\t!scrim see");
						}
					});
					break;
					
						
				case 'leave':
					if (args.length != 1 ){
						msg.channel.send("You need to specify which scrim you want to leave, like this:\n\t!scrim leave [id]\nTo know the id for your desired scrim, use:\n\t!scrim see");
						break;
					}
					database.ref(args[0]).once('value').then(function(snap){
						if (snap.exists()){
							var users = snap.val().users;
							if (users == null || !users.includes(msg.author.id)) {
								msg.channel.send("You weren't on this scrim in the first place. Are you trying to mess with me?\nHA! You thought you could trick me...");
							} else {
								var temp = [];
								var main = false;
								for (var i=0; i<users.length; i++){
									if (users[i] != msg.author.id){
										temp.push(users[i]);
											
									} else if (i<8)	main=true;
								}
								database.ref(args[0]+'/users').set(temp);
								var confirmed = snap.val().confirmed;
								if (confirmed != null){
									var temp = [];
									for (var i=0; i<confirmed.length; i++){
										if (confirmed[i] != msg.author.id){
											temp.push(users[i]);
												
										}
									}
									console
									database.ref(args[0]+'/confirmed').set(temp);
								}
								if (main && users.length>8){
									msg.channel.send("Okay, I've removed you from scrim "+args[0]+"\nCongrats <@!"+temp[7]+">, now you are on the main list for scrim "+args[0]+".\nUse this command to check the people you'll be playing with\n\t!scrim users "+args[0]);
								} else {
									msg.channel.send("Okay, I've removed you from scrim "+args[0]+". But it makes me so sad you are leaving us :sob:");
								}
							}
						} else {
							msg.channel.send("There is no scrim "+args[0]+". Check the current scrim list by typing\n\t!scrim see");
						}
					});
					break;
				
					
				case 'see':
					database.ref().once('value').then(function(snap){
						var mes = "";
						if (!snap.exists()){
							mes += "Currently there are no programmed scrims";
						} else {
							mes += "This is the list of current scrims:\n";
							snap.forEach(function(child){
								var pl = 0;
								if (child.val().users != null){
									if (child.val().users.length<8) pl=child.val().users.length;
									else pl = 8
								} 
								mes += "\tID: "+child.key+"\tDATE: "+child.val().date+"\tTIME: "+child.val().time+"\tPlayers: "+pl+"\n";
							});
							mes += "(Remember times follows UTC standard, use google to check your local time equivalence)\nTo see which users have joined a scrim, use the command\n\t!scrim users [id]";
						}
						msg.channel.send(mes);
					});
					break;
					
				case 'users':
					if (args.length != 1 ){
						msg.channel.send("You need to specify which scrim you want to show its participants, like this:\n\t!scrim users [id]\nTo know the id for your desired scrim, use:\n\t!scrim see");
						break;
					}
					database.ref(args[0]).once('value').then(function(snap){
						if (snap.exists()){
							database.ref(args[0]+'/users').once('value').then(function(snap){
								if (!snap.exists()) {
									msg.channel.send("Oh no! This scrim is empty. be the first to join by typing\n\t!scrim join "+args[0]);
								} else {
									var waiters = snap.val();
									var users = waiters.splice(0,8);
									mes = "This is the participant list for scrim "+args[0]+"\n";
									for (user of users){
										mes += "\t"+msg.guild.members.cache.get(user).displayName+"\n";
									}
									if (users.length < 8) {
										mes += "Would you like to join us? Just type\n\t!scrim join "+args[0];
									} else if (waiters.length > 0) {
										mes += "And these are the people on the waiting list, in case some player fails\n";
										for (user of waiters) {
											mes += "\t"+msg.guild.members.cache.get(user).displayName+"\n";
										}
									}
									msg.channel.send(mes);
								}
							});
						} else {
							msg.channel.send("There is no scrim "+args[0]+". Check the current scrim list by typing\n\t!scrim see");
						}
					});
					break;
					
					
				case 'confirm':
					if (args.length != 1 ){
						msg.channel.send("You need to specify which scrim you want to confirm your assistance to, like this:\n\t!scrim confirm [id]\nTo know the id for your desired scrim, use:\n\t!scrim see");
						break;
					}
					database.ref(args[0]).once('value').then(function(snap){
						if (snap.exists()){
							var users = snap.val().users;
							if (users == null)	users = [];
							if (users.includes(msg.author.id)){
								var fecha = snap.val().date.split('/');
								var hora = snap.val().time.split(':');
								var date = Date.UTC(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0);
								var current = Date.now()+15*60000;
								if (current > date){
									var confirmed = snap.val().confirmed;
									if (confirmed == null)	confirmed = [];
									confirmed.push(msg.author.id);
									database.ref(args[0]+'/confirmed').set(confirmed);
									msg.channel.send("Your assistance has been confirmed. Thank you.");
								} else {
									msg.channel.send("You can only confirm your assistance 15 min before the scrim, not sooner. I'll ping you at the time, don't worry");
								}
							} else  {
								msg.channel.send("I can't confirm your assistance as you weren´t signed up for this scrim. You can join by typing:\n\t!scrim join "+args[0]);
							}
						} else {
							msg.channel.send("There is no scrim "+args[0]+". Check the current scrim list by typing\n\t!scrim see");
						}
					});
					break;
					
				case 'reschedule':
					if (args.length != 3 ){
						msg.channel.send("You need to specify which scrim you want to reschedule, like this:\n\t!scrim reschedule [id] [date] [time]\nRemember to specify time in UTC standard\nTo get the acive scrims list, use:\n\t!scrim see");
						break;
					}
					if ( getRole(msg.author.id,msg.guild) == 0 ){
						msg.channel.send("You don't have the privileges to do this. Only @LaGmin or @[LaG]FairyPrincess can reschedule a scrim");
						break;
					}
					database.ref(args[0]).once('value').then(function(snap){
						if (snap.exists()){
							var fecha = args[1].split('/');
							var hora = args[2].split(':');
							var date = Date.UTC(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0);
							if (date > Date.now()+15*60000){
								database.ref(args[0]).set({
									date: args[1],
									time: args[2],
									users: snap.val().users
								});
								for (var i=0; i<jobs.length; i++){
									if (jobs[i][0] == args[0]){
										jobs[i][1].cancel();
										if (jobs[i][2] != null)	jobs[i][2].cancel();
										jobs.splice(i,1);
										break;
									}
								}
								var job1 = scheduler.scheduleJob(date,function(id, channel, guild){
									activateScrim(id,channel,guild);
									}.bind(null,args[0], msg.channel, msg.guild));
								var job2 = scheduler.scheduleJob(date-15*60000,function(id, channel){
									confirmScrim(id,channel);
									}.bind(null,args[0], msg.channel));
								jobs.push([args[0],job1,job2]);
								msg.channel.send("Scrim "+args[0]+" succesfully rescheduled.");
							} else {
								msg.channel.send("I cant reschedule scrim "+args[0]+" to that date, please choose a date in the future, with a 15 minute margin.");
							}
						} else {
							msg.channel.send("There is no scrim "+args[0]+". Check the current scrim list by typing\n\t!scrim see");
						}
					});
					break;
				
				
				case 'help':
					if (args[0] === "advanced"){
						msg.channel.send("Advanced commands (only @LaGmin or @[LaG]FairyPrincess can use them):\n\t!scrim create [date] [time]\t\tCreates a new scrim. Replace [date] with the proper date following the format dd/mm/yyyy. Replace [time] with the proper time, in 24h format. [time] must be specified in UTC standard, use google for conversion to local time\n\t!scrim destroy [id]\t\tDeletes a scrim. Replace [id] wit the id from the scrim you want to delete. All data, including participants, will be deleted. Be sure of doing this, because there is no coming back.\n\t!scrim reschedule [id] [date] [time]\t\tReschedules the specified scrim to a new date. Replace [id] wit the corresponding scrim's id. Replace [date] with the proper date following the format dd/mm/yyyy. Replace [time] with the proper time, in 24h format. [time] must be specified in UTC standard, use google for conversion to local time");
					} else {
						msg.channel.send("This is the list of available commands.\n\t!scrim see\t\tShows a list with all currently active scrims, their ids, datas and times\n\t!scrim users [id]\t\tShows the participants list for a scrim. Just replace [id] with the corresponding scrim's id\n\t!scrim join [id]\t\tJoin a scrim. Replace [id] with the corresponding scrim's id\n\t!scrim confirm [id]\t\tConfrim your assistance to a scrim. Replace [id] with the corresponding scrim's id. Can only be done 15 min before scrim, and no sooner\n\t!scrim leave [id]\t\tLeave a scrim. Replace [id] with the corresponding scrim's id\n\t!scrim help\t\tShows this message.");
					}
					break;
				
				default:
					msg.channel.send("I'm sorry, I don't know that command (maybe you had a typo?). Type this to see the command list\n\t!scrim help");

			} 
			
				
		} else if ( msg.author.id != bot.user.id && getRole(msg.author.id,msg.guild) == 0 && !hosts.includes(msg.author.id)){	
			msg.author.send("I've deleted your message on #Scrim channel. Remember you can only post on that channel to ask things to me, using the commands, or if you're hosting a scrim (and only for 1 hour in that case). I'll remember you the list of commands, in case you forgot\n\t!scrim see\t\tShows a list with all currently active scrims, their ids, datas and times\n\t!scrim users [id]\t\tShows the participants list for a scrim. Just replace [id] with the corresponding scrim's id\n\t!scrim join [id]\t\tJoin a scrim. Replace [id] with the corresponding scrim's id\n\t!scrim confirm [id]\t\tConfrim your assistance to a scrim. Replace [id] with the corresponding scrim's id. Can only be done 15 min before scrim, and no sooner\n\t!scrim leave [id]\t\tLeave a scrim. Replace [id] with the corresponding scrim's id\n\t!scrim help\t\tShows this message.");
			msg.delete().then(console.log("Deleted message from "+msg.guild.members.cache.get(msg.author.id).displayName));
		}
	}
});

