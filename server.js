function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
    [array[i], array[j]] = [array[j], array[i]];
  }
}


function checkId(ne, json){
	for (var i=0; i<json.lista.length; i++){
		if (json.lista[i].id == ne)	return true;
	}
	return false;
}

function createMatch(date, time, json, creator){
	var id = 0;
	while (checkId(id, json)){
		id++;
	}
	var newScrim = JSON.parse("{\n\"id\": \""+id+"\",\n\"author\": \""+creator+"\",\n\"date\": \""+date+"\",\n\"time\": \""+time+"\",\n\"users\": []\n}"); 
	json.lista.push(newScrim);
	fs.writeFile('./scrims.json', JSON.stringify(json,null,2), () => {});
	return id;
}

function removeMatch(rem, json, user){
	var data = null;
	for (var i=0; i<json.lista.length; i++){
		if (json.lista[i].id == rem){
			if (json.lista[i].author == user){
				data = json.lista.splice(i,1)[0];
			}
		}
	}
	
	if (data != null)	fs.writeFile('./scrims.json', JSON.stringify(json,null,2), () => {});
	return data;
}

function activateScrim(id, msg){
	var index;
	for (index=0; index<json.lista.length; index++){
		if (json.lista[index].id == id)	break;
	}
	if (index == json.lista.length){
		msg.channel.send('A scrim was programmed for this time, but some error happened and scrim data was lost');
		return;
	}
	mes = "\nGet ready players! Your scrim is about to start!\n\nI've made random teams, I hope you like them:\nTeam 1: ";
	shuffle(json.lista[index].users);
	var team1 = json.lista[index].users.slice(0,json.lista[index].users.length/2);
	var team2 = json.lista[index].users.slice(json.lista[index].users.length/2,json.lista[index].users.length);
	
	for (var i=0; i<team1.length; i++){
		mes += "<@!"+team1[i]+"> "
	}
	mes+="\nTeam 2: ";
	for (var i=0; i<team2.length; i++){
		mes += "<@!"+team2[i]+"> "
	}
	var maps = ["Urban", "Outpost", "Woods", "Meltdown", "Office", "Prision", "Canyon"];
	shuffle(maps);
	mes+="\n\nI have also chosen the maps for the different rounds you'll be playing, here they go:\n";
	for (var i=0; i<3; i++){
		mes += "Round "+(i+1)+": "+maps[i]+"\t"
	}
	mes+="\n\nGet ready to fight, and show who is the best LaG player. Good Luck!";
	msg.channel.send(mes);
	removeMatch(id,json, json.lista[index].author);
	for (var i=0; i<jobs.length; i++){
		if (jobs[i][0] == id){
			var j = jobs.splice(i,1);
			j[0][1].cancel();
			break;
		}
	}
	return;
}

function makeBackup(json){
	mesgs = [];			
	for (scrim of json.lista){
		var mes = "\n!scrim fix "+scrim.date+" "+scrim.time+" "+scrim.author;
		for (u of scrim.users){
			mes += " "+u;
		}
		mes += "\n";
		mesgs.push([scrim.id,mes]);
	}
	mesgs.sort(function(a,b){
		return a[0]-b[0]
	});
	out = "";
	for (mes of mesgs){
		out += mes[1];
	}
	if (out) return out;
	return "\nNothing to backup\n";
}

require('dotenv').config();
var Discord = require('discord.js');
var scheduler = require('node-schedule');
var fs = require('fs');

var json = require('./scrims.json');
var jobs = []

var bot = new Discord.Client();

bot.login(process.env.TOKEN);

bot.on('ready', () => {
	console.log(bot.user.username+" is up and running");
});


bot.on('message', msg => {

	if (msg.content.substring(0, 7) == '!scrim ' && msg.channel.name == 'scrim' && msg.author.id != bot.user.id) {
		var args = msg.content.split(" ");
		var cmd = args[1];
		args = args.splice(2);
		switch(cmd) {
			// Add a new scrim
			case 'new':
				if (args.length != 2){
					msg.channel.send('Improper use of command. To create a new scrim please type\n\t!scrim new <date> <time>\nDate must follow dd/mm/yyyy format\nTime must follow hh:mm in a 24h format, and gets interpreted as local Spanish time\nFor more help type\n\t!scrim help');
				} else {
					var fecha = args[0].split('/');
					var hora = args[1].split(':');
					var now = Date.now();
					var date = Date.UTC(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0);
					if (date > now){
						var id = createMatch(args[0], args[1], json, msg.author.id);
						var j = scheduler.scheduleJob(date,function(id,msg){
							activateScrim(id,msg);
							}.bind(null,id,msg));
						jobs.push([id,j]);
						console.log(makeBackup(json));
						msg.channel.send("New scrim created with id  = "+id+"\nScrim is programmed for "+args[0]+" at "+args[1]+" UTC (use google to get time at your location)\nRemember currently there are no users signed up for this scrim. To sign yourself up please type:\n\t!scrim addme  "+id+"\n@everyone\nBe fast, or I'll have to join myself and use minigun muahaha!");
					} else {
						msg.channel.send("I'm sorry, I don't know how to time travel (yet!). Please specify a scrim date in the future");
					}
				}
			break;
			
			//Remove a scrim
			case 'remove':
				if (args.length != 1){
					msg.channel.send('Improper use of command. To delete a new scrim please type\n\t!scrim remove <id> \nIf you want to see a list of active scrims, please type\n\t!scrim see\nFor more help type\n\t!scrim help');
				} else {
					var data = removeMatch(args[0], json, msg.author.id);
					if (data != null){
						for (var i=0; i<jobs.length; i++){
							if (jobs[i][0] == args[0]){
								jobs[i][1].cancel();
								jobs.splice(i,1);
								break;
							}
						}
						var users = "";
						for (var i=0; i<data.users.length; i++){
							users += "<@!"+data.users[i]+">\n"
						}
						console.log(makeBackup(json));
						msg.channel.send("Scrim with id = "+data.id+" has been succesfully removed.\nI'm sad you aren't going to play it :(\nNotifying signed up members:\n"+users);
					} else {
						msg.channel.send("Sorry, I was unable to find scrim "+args[0]+". To see the list of currently active scrims please type\n\t!scrim see\nFor more help type\n\t!scrim help");
					}
				}
			break;
			
			//Add a user
			case 'addme':
				if (args.length != 1){
					msg.channel.send('Improper use of command. To add yourself to the scrim please type\n\t!scrim addme <id> \nIf you want to see a list of active scrims, please type\n\t!scrim see\nFor more help type\n\t!scrim help');
				} else {
					var index;
					for (index=0; index<json.lista.length; index++){
						if (json.lista[index].id == args[0])	break;
					}
					if (index < json.lista.length){
						var error = json.lista[index].users.includes(msg.author.id);
						if (!error){					
							json.lista[index].users.push(msg.author.id);
							fs.writeFile('./scrims.json', JSON.stringify(json,null,2), () => {});
							users = "";
							for (mem of json.lista[index].users){
								users += "\t"+msg.guild.members.cache.get(mem).displayName+"\n"
							}
							console.log(makeBackup(json));
							msg.channel.send("You have succesfully being added to scrim "+json.lista[index].id+"\nThis is the list of current members for this scrim:\n"+users);
						} else {
							msg.channel.send("Don't be greedy, you were already on this scrim!");
						}
					} else {
						msg.channel.send("Sorry, I was unable to find scrim "+args[0]+". To see the list of currently active scrims please type\n\t!scrim see\nFor more help type\n\t!scrim help");
					}
				}
			break;
			
			
			//Remove a user
			case 'delme':
				if (args.length != 1){
					msg.channel.send('Improper use of command. To remove yourself from the scrim please type\n\t!scrim delme <id> \nIf you want to see a list of active scrims, please type\n\t!scrim see\nFor more help type\n\t!scrim help');
				} else {
					var index;
					for (index=0; index<json.lista.length; index++){
						if (json.lista[index].id == args[0])	break;
					}
					if (index < json.lista.length){
						var value = json.lista[index].users.indexOf(msg.author.id);
						if (value != -1){
							json.lista[index].users.splice(value,1);
							fs.writeFile('./scrims.json', JSON.stringify(json,null,2), () => {});
							users = "";
							for (mem of json.lista[index].users){
								users += "\t"+msg.guild.members.cache.get(mem).displayName+"\n"
							}
							console.log(makeBackup(json));
							msg.channel.send("You have succesfully being removed from scrim "+json.lista[index].id+"\nThis is the list of current members for this scrim:\n"+users);
						} else {
							msg.channel.send("Sorry, I couldn't find you on this scrim's member list.\nMaybe I made a mistake?\nImposible! I am a machine.");
						}
					} else {
						msg.channel.send("Sorry, I was unable to find scrim "+args[0]+". To see the list of currently active scrims please type\n\t!scrim see\nFor more help type\n\t!scrim help'");
					}
				}
			break;
			
			//See scrim list
			case 'see':
				if (args.length != 0){
					msg.channel.send('Improper use of command. To see the active scrim list please type\n\t!scrim see\nFor more help type\n\t!scrim help');
				} else {
					var mes = ""
					if (json.lista.length>0){
						 mes = "This is the list of currently active scrims:\n";
						for (var i=0; i<json.lista.length; i++){
							mes += "\tID: "+json.lista[i].id+"\tDATE: "+json.lista[i].date+"\tTIME: "+json.lista[i].time+" utc\n"
						}
						mes += "To see which users are participating on each scrim, please type\n\t!scrim users <id>"
					} else {
						mes = "Currently there are no programed scrims. I'm sorry about it :(";
					}
					msg.channel.send(mes);
				}
			break;
			
			//See signed up users
			case 'users':
				if (args.length != 1){
					msg.channel.send('Improper use of command. To see the members list for a scrim please type\n\t!scrim users <id>\nFor more help type\n\t!scrim help');
				} else {
					var index;
					for (index=0; index<json.lista.length; index++){
						if (json.lista[index].id == args[0])	break;
					}
					if (index < json.lista.length){
						var mes = "This is the member list for scrim "+args[0]+"\n";
						for (user of json.lista[index].users){
							mes += "\t"+msg.guild.members.cache.get(user).displayName+"\n"
						}
						msg.channel.send(mes);
					} else {
						msg.channel.send("Sorry, I was unable to find scrim "+args[0]+". To see the list of currently active scrims please type\n\t!scrim see\nFor more help type\n\t!scrim help'");
					}
				}
			break;
			
			case 'fix':
				var fecha = args[0].split('/');
				var hora = args[1].split(':');
				var date = new Date(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0);
				var now = new Date;
				if (date > now){
					var id = createMatch(args[0], args[1], json);
					var j = scheduler.scheduleJob(date,function(id,msg){
						activateScrim(id,msg);
						}.bind(null,id,msg));
					jobs.push([id,j]);
					json.lista[json.lista.length-1].author = args[2];
					args = args.splice(3);
					for (user of args){
						json.lista[json.lista.length-1].users.push(user);						
					}
					console.log("Scrim auto-created from fix command");
					fs.writeFile('./scrims.json', JSON.stringify(json,null,2), () => {});
				}
				
			break;
			
			case 'backup':
				msg.channel.send(makeBackup(json));
				break;
				
			default:
				msg.channel.send("This is the list of available commands.\nThoughout this help menu, <something> will mean you need to replace >something> with some info, like ids, datas, times, etc. You are not meat to type <something> literally.\n\n\t!scrim see\nShows a list with all currently active scrims, their ids, datas and times\n\n\t!scrim users <id>\nShows which users have signed ut for whatever scrim you specify in the field <id>\n\n\t!scrim addme <id>\nAdd yourself to whatever scrim you specify with <id>\n\n\t!scrim delme <id>\nRemoves yourself from specified scrim.\n\n\thelp\nShows this message.\n\nThere are also more advanced commands, swon now. Please dont use these unless you know what you're doing.\n\n\t!scrim new <date> <time>\tCreates a new scrim. <date> must follow the format dd/mm/yyyy and <time> must be hh:mm 24H format UTC\n\n\t!scrim remove <id>\tCancels the specified scrim. All data, including participants, will be deleted. Only the person that made the scrim can remove it, to avoid accidents.");


		}
	}
});
