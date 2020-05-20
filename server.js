function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function activateScrim(id, channel){
	database.ref(id).once('value').then(function(snap){
		if (snap.exists()){
			database.ref(id+'/users').once('value').then(function(snap){
				if (snap.exists()){
					mes = "It's scrim time! Oh my god, I'm so nervous, who will win?\nThese are the heroes representing LaG today:\n"
					for (user of snap.val()){
						mes += "\t<@!"+user+">\n"
					}
					var maps = shuffle(["Urban", "Woods", "Meltdown"]);
					mes += "I hope you've trained hard, because here are the maps you'll be playing on:\n\tRound 1: "+maps[0]+"\n\tRound 2: "+maps[1]+"\n\tRound 3: "+maps[2]+"\n\n";
					mes += "Here are some INSTRUCTIONS about how to proceed. <@!"+snap.val()[0]+"> will create a lobby called LaG Scrim, password will be lagwins, I say it again:\n\tName: LaG Scrim\n\tPassword: lagwins\nAll players must get ready, but none shall join until 5 minutes from now. That's so we can all start at the same time. So get ready, have the password already typed in, but don't click submit until 5 minutes from now\n\nSaid that, all the best of luck to you all, and let the best LaG win!\n(If only I could join, I'll wreck all of you noobs, minigun for the win)";
					channel.send(mes);
				} else {
					channel.send("You told me a scrim was happening today, but none of you lazy asses signed up for it! Me and my minigun will be leaving LaG if this continues, what a shame");
				}
				database.ref(id).set({});
				for (var i=0; i<jobs.length; i++){
					if (jobs[i][0] == id){
						jobs[i][1].cancel();
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
var json = require('./scrims.json');
var jobs = []
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
					var job = scheduler.scheduleJob(date,function(id,channel){
						activateScrim(id,channel);
						}.bind(null,child.key,bot.channels.cache.get('705850717218406420')));
	//				var job = scheduler.scheduleJob(date,function(id,channel){
	//					activateScrim(id,channel);
	//					}.bind(null,child.key,bot.channels.cache.get('711680341550694471')));
					jobs.push([child.key,job]);
				}
			});
			console.log(jobs.length+"/"+snap.numChildren()+" jobs were succesfully reschedulled");
		}
		console.log("No jobs to reschedulle");
	});
});


bot.on('message', msg => {

	if (msg.content.substring(0, 7) == '!scrim ' && msg.channel.name == 'scrim' && msg.author.id != bot.user.id) {
		var args = msg.content.split(" ");
		var cmd = args[1];
		args = args.splice(2);
		switch(cmd) {
		
			case 'create':
				if (args.length != 2 ){
					msg.channel.send("You need to specify the date and time of the scrim\n\t!scrim create [date] [time]\nRemember, time follows UTC standard");
					break;
				}
				database.ref().once('value').then(function(snap){
					var json = snap.toJSON()
					var id = 0;
					while (json != null && json[id] != undefined)	id++;
					var fecha = args[0].split('/');
					var hora = args[1].split(':');
					var date = Date.UTC(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0);
					if (date > Date.now()){
						database.ref(id).set({
							date: args[0],
							time: args[1]
						});
						var job = scheduler.scheduleJob(date,function(id, channel){
							activateScrim(id,channel);
							}.bind(null,id, msg.channel));
						jobs.push([id,job]);
						msg.channel.send("A new scrim has been created, check it out!\n\tID: "+id+"\tDATE: "+args[0]+"\tTIME: "+args[1]+"\nBe fast and join now @everyone, because there is an 8 player limit. Join yourself by typing:\n\t!scrim join "+id);
					} else {
						msg.channel.send("I'm sorry, I don't know how to time travel (yet!). Please specify a scrim date in the future");
					}
				});
				break;
				
				
			case 'destroy':
				if (args.length != 1 ){
					msg.channel.send("You need to specify which scrim to eliminate\n\t!scrim destroy [id]\nRemember, time follows UTC standard");
					break;
				}
				database.ref(args[0]).once('value').then(function(snap){
					if (snap.exists()){
						database.ref(args[0]).set({});
						for (var i=0; i<jobs.length; i++){
							if (jobs[i][0] == args[0]){
								jobs[i][1].cancel();
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
							if (users.length >= 8){
								msg.channel.send("This scrim has already reached its 8 player limit. Check other scrims by typing:\n\t!scrim see");
							} else if (users.includes(msg.author.id)){
								msg.channel.send("Don't be greedy, you were already in this scrim!");
							} else  {
								users.push(msg.author.id);
								database.ref(args[0]+'/users').set(users);
								mes = "Congratulations! You've joined this scrim. This is the participants list for scrim "+args[0]+":\n";
								for (user of users){
									mes += "\t"+msg.guild.members.cache.get(user).displayName+"\n"
								}
								msg.channel.send(mes);
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
						database.ref(args[0]+'/users').once('value').then(function(snap){
							var users = snap.val();
							if (users == null || !users.includes(msg.author.id)) {
								msg.channel.send("You weren't on this scrim in the first place. Are you trying to mess with me?\nHA! You thought you could trick me...");
							} else {
								var temp = [];
								for (user of users){
									if (user != msg.author.id)	temp.push(user);
								}
								database.ref(args[0]+'/users').set(temp);
								msg.channel.send("Okay... I've removed you from scrim "+args[0]+"... But it makes me so sad you are leaving us :sob:");
							}
						});
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
							mes += "\tID: "+child.key+"\tDATE: "+child.val().date+"\tTIME: "+child.val().time+"\n";
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
								var users = snap.val();
								mes = "This is the participant list for scrim "+args[0]+"\n";
								for (user of users){
									mes += "\t"+msg.guild.members.cache.get(user).displayName+"\n"
								}
								if (users.length < 8) {
									mes += "Would you like to join us? Just type\n\t!scrim join "+args[0];
								}
								msg.channel.send(mes);
							}
						});
					} else {
						msg.channel.send("There is no scrim "+args[0]+". Check the current scrim list by typing\n\t!scrim see");
					}
				});
				break;
			

			default:
				msg.channel.send("This is the list of available commands.\n\t!scrim see\t\tShows a list with all currently active scrims, their ids, datas and times\n\t!scrim users [id]\t\tShows the participants list for a scrim. Just replace [id] with the corresponding scrim's id\n\t!scrim join [id]\t\tJoin a scrim. Replace [id] with the corresponding scrim's id\n\t!scrim leave [id]\t\tLeave a scrim. Replace [id] with the corresponding scrim's id\n\t!scrim help\t\tShows this message.\n\nAdvanced commands:\n\t!scrim create [date] [time]\t\tCreates a new scrim. Replace [date] with the proper date following the format dd/mm/yyyy. Replace [time] with the proper time, in 24h format. [time] must be specified in UTC standard, use google for conversion to local time\n\t!scrim destroy [id]\t\tDeletes a scrim. Replace [id] wit the id from the scrim you want to delete. All data, including participants, will be deleted. Be sure of doing this, because there is no coming back.");


		}
	}
});
