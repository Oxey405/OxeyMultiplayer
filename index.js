//(c) Oxey405 2022 - MIT license
//Comments formatted like this : french -- english
//Commentaires écrits en : français -- anglais
//Variables written in french for now

//On importe tous les modules dont ont a besoin
const WebSocket = require("ws");
const crypto = require("crypto");
const express = require("express");
const webapp = express();

webapp.listen(3000, () =>  {
  console.log("webapp démarrée")
})

let appName = "OxeyMultiplayer server"

/**
 * Plan de construction d'un objet "Message"
 * @param {Number} id identifiant "public" -- public id
 * @param {String} secret identifiant secret pour confirmer l'origine d'un message -- secret id to confirm message's origin
 * @param {Number} posX position X du joueur -- X pos of player
 * @param {Number} posY position Y du joueur -- Y pos of player
 * @param {Array} inventaire inventaire du joueur -- inventory of player
 */
class Message {
  constructor(id, posX, posY, angle, inventaire, idPartie) {
    this.id = id;
    this.posX = posX;
    this.posY = posY;
    this.angle = angle;
    this.inventaire = inventaire;
    this.idPartie = idPartie;
    this.type = "infoJoueur"; // infoJoueur = "playerInfo" in french
  }
  /**convertir l'objet en JSON -- Convert object to JSON*/
  toJSON() {
    return JSON.parse(
      `{"id":${this.id},"secret":"${this.secret}", "posX":${this.posX}, "posY":${this.posY}, "angle":${this.angle}, "inventaire":[${this.inventaire}]}`
    );
  }
  /**convertir l'objet en Texte -- Convert object to text JSON*/
  toString() {
    return `{"id":${this.id},"secret":"${this.secret}", "posX":${this.posX}, "posY":${this.posY}, "angle":${this.angle}, "inventaire":[${this.inventaire}]}`;
  }
}

/**
 * Plan de construction d'un object "Client"
 * The blueprint for a "Client" object
 * Il contient -- contains :
 * @param {Number} id identifiant "public" -- "public" id of a client
 * @param {any} socket Websocket client
 */
class Client {
  constructor(id, socket) {
    this.id = id;
    this.socket = socket;
  }

/**convertir l'objet en JSON -- Convert object to JSON*/
  toJSON() {
    return JSON.parse(
      `{"id":${this.id},"type":"init"}`
    );
  }
  /**convertir l'objet en Texte -- Convert object to text JSON*/
  toString() {
    return `{"id":${this.id},"type":"init"}`;
  }
}

/**
 * Plan de construction d'un object "Partie"
 * The blueprint for a "Partie" (Game) object
 * Il contient : -- contains
 * @param {Array} clients la liste des clients de cette parties -- clients in the game
 * @param {String} etat état actuel de la partie ["playing", "finished", "error"] -- state of the game ["playing", "finished", "error"]
 * @param {String} idPartie l'identifiant de la partie -- Game ID
 */
class Partie {
  constructor(clients, etat) {
    this.clients = clients;
    this.etat = etat;
    this.idPartie = crypto
      .createHash("sha256")
      .update(crypto.randomBytes(16))
      .digest()
      .toString("hex")
      .substring(0, 16);
  }
}
const wss = new WebSocket.Server({ port: 8080 });

console.log("🌐 Serveur en ligne sur le port 8080");
//debug : compter les ticks/secondes -- count ticks/seconds
let tick = 0;
setInterval(() => {
  //console.log(tick + "ticks/seconde");
  //décommentez la ligne du dessus pour afficher le tps du serveur (le taux de rafraichissements par seconde) -- uncomment the ligne above to show server's TPS (refresh rate per second)
  tick = 0;
}, 1000); //réinitialise le compteur de ticks toute les 1 seconde -- reset ticks count to 0 every sec.

//contiens la liste de nos clients -- list of our clients
let clients = [];
//contiens la liste de nos parties -- list of games
let parties = [];
//Pour le déboggage -- For debugging (time of processing)
let tempsDeTraitement = 0;
let derniersTempsDeTraitements = [];
//Evenement qui s'active lorsqu'une connection est détectée -- This event activate whenever a client connects
wss.on("connection", (client) => {
  //on lui donne son identifiant dans un format JSON converti en texte -- give client an ID in JSON texy
  let identifiant = clients.length + 1;

  //on créé un nouveau client -- creating a NEW client.
  let clientCree = new Client(identifiant, client);

  //on ajoute le client à la liste des clients connectés -- adding client to clients list
  clients.push(clientCree);
  let donnesAEnvoyer = clientCree.toString();
  client.send(donnesAEnvoyer.toString());
  //on envoie un message dans la console. -- Log the fact that a client connected in console
  console.log(
    "🎮 Nouveau joueur connecté. (ID: " +
      identifiant +
      ")"
  );
  //si on a deux clients, on les mets dans une partie -- if there are twos clients, we init a game
  if (clients.length == joueursParPartie) {
    let partie = new Partie(clients, "playing");
    parties.push(partie);

    clients = [];
    console.log(
      "🎮 "+ joueursParPartie +" joueurs connectés : début de la partie (ID #" +
        partie.idPartie +
        " )"
    );
    setTimeout(() => {
      partie.clients.forEach((clientActuel) => {
        clientActuel.socket.send(
          `{"idPartie":"${partie.idPartie}","type":"start"}`
        );
      });
    }, 500); //500ms pour être sur que le client n°2 a eu le temps de traiter le message précédent
  }

  //quand on reçoit un message du client
  client.on("message", (message) => {
    derniersTempsDeTraitements.push(tempsDeTraitement);
    //si il y a 10 éléments ou plus, retirer le premier
    if(derniersTempsDeTraitements.length >= 10) {
      derniersTempsDeTraitements.shift();
    }
    tempsDeTraitement = 0;
    let debutTraitement = Date.now();

    //à faire : anti-triche

    //on vérifie que le message contient uniquement des bonnes informations
    /**
     * Liste des codes d'erreurs -- error codes :
     * 001 : Impossible de formatter l'entrée  -- Cannot format input
     * 002 : Pas de données reçues -- No data recieved
     * 003 : Données invalides -- Invalid data
     * 004 : Mauvaise origine -- Wrong origin (sender)
     * 005 : Packet trop lourd -- Packet too heavy
     */

    //1. vérifier que le message n'est pas vide -- check if message isn't empty
    if ((message.length == 0)) {
      client.send(`{"error":002,"type":"error"}`);
      tempsDeTraitement = (Date.now() - debutTraitement);
      return;
    }
    if((message.length > 512 )) {
      client.send(`{"error":005, "type":"error"}`);
      tempsDeTraitement = (Date.now() - debutTraitement);
      return;
    }
    //2. Formatter le message
    let messageFormate;
    try {
      //on ESSAIE (try) de formatter le message -- try to format message
      messageFormate = JSON.parse(message);
    } catch (error) {
      //Si il y a une erreur, on l'attrape (catch) -- if error, catch it
      //et on renvoie un code d'erreur au client formatté en JSON mais en texte -- if error, send error code to client
      client.send(`{"error":001,"type":"error"}`);
      //puis on l'affiche dans la console -- show error in console
      console.log(error);
      tempsDeTraitement = (Date.now() - debutTraitement);
      return;
      
    }
    //3. Mettre le message dans un objet Message -- Put message in a message object
    let msgCorrect;
    try {
      //tenter de mettre le message reçu dans son objet "Message" -- try to put the message in a message object
      //le but de cette action est de garder UNIQUEMENT les données qui nous intéressent et éviter de l'injection de données non voulues. --
      //the goal of this action is to ONLY keep datas that we need and to avoid unwanted data injection
      msgCorrect = new Message(
        messageFormate.id,
        messageFormate.posX,
        messageFormate.posY,
        messageFormate.angle,
        messageFormate.inventaire,
        messageFormate.idPartie
      );
    } catch (error) {
      client.send(`{"error":003,"type":"error"}`);
      console.log("le message envoyé n'est pas valide");
      tempsDeTraitement = (Date.now() - debutTraitement);
      return;
    }
      //trouver la partie correspondante dans la liste -- find the matching game in the list
      for (let i = 0; i < parties.length; i++) {
        const partie = parties[i];
        if (partie.idPartie == msgCorrect.idPartie) {
            //Vérifier si l'envoyeur a le bon secret -- check if sender has the valid secret
            for (let z = 0; z < partie.clients.length; z++) {
              const clientActuel = partie.clients[z];
              //prendre le client ayant envoyé le message
              if(clientActuel.client == client) {
                if(clientActuel.id != msgCorrect.id) {
                  // si le client ayant envoyé la donnée n'a pas donné son bon identifiant, ignorer. -- If the client sent a message but with the wrong ID, dismiss.
                  client.send(`{"error":004,"type":"error"}`);
                  console.log("🚨client avec un ID invalide")
                  tempsDeTraitement = (Date.now() - debutTraitement);
                  return;
                }

              }
            }
          //pour chaque instance des clients connectés -- for each instance of connected clients in a game
          partie.clients.forEach((instanceDeClient) => {
            //supprimer le secret de l'autre client
            let msgAEnvoyer = msgCorrect.toJSON();
            msgAEnvoyer.secret = "";
            //pour tout les clients connectés qui ne sont pas celui qui a envoyé le message -- for all connected clients except the one who sent the message
            if (instanceDeClient.socket != client) {
              //transmettre le message aux clients -- send message to all clients
              instanceDeClient.socket.send(JSON.stringify(msgAEnvoyer));
            }
          });
          tick++; // Ajouter un tick marquant donc la fin d'un cycle de traitement -- Add a tick marking the end of a treatment cycle
          tempsDeTraitement = (Date.now() - debutTraitement);
          return;
        }
      }
    }
  );

  //lors d'une déconnection d'un client
  client.on('close', () => {
    //si le client est déconnecté, on le supprime
    console.log("client déconnecté... suppression de sa connection...");
    //voir si il n'est pas dans une partie
    for (let i = 0; i < clients.length; i++) {
      const clientActuel = clients[i];
      if(clientActuel.socket == client) {
        clients.splice(i, 1);
        console.log("le client n°" + (clientActuel.id) + " a été supprimé.");
        return;
      } else {
        continue;
      }
    }
    //voir si le client est dans une partie
    for (let i = 0; i < parties.length; i++) {
      const partieActuelle = parties[i];
      let clientsDePartie = partieActuelle.clients;
      for (let i = 0; i < clientsDePartie.length; i++) {
        const clientActuel = clientsDePartie[i];
        if(clientActuel.socket == client) {
          clientsDePartie.splice(i, 1);
          console.log("le client n°" + (clientActuel.id) + " a été supprimé.");
          return;
        } else {
          continue;
        }
      }
    }
    console.log("action finie...")
  })
});


let wsState = "closed";
wss.on("listening", () => {
  wsState = "listening";
})

wss.on("close", () => {
  wsState = "closed";
})

let joueursParPartie = 2;

webapp.get("/", (req, res) => {
  res.send(
    `<html>
      <head>
      <title>OxeyMultiplayer state</title>
      </head>
      <body>
      <style>
      body {
        color:white;
        background-color:#141414;
        font-family:'Rubik';
      }
      </style>
      <h1>Etat du serveur «${appName}» (State of server «${appName}»)</h1>
      <h2>Websocket</h2>
      <p>Etat du websocket (websocket state) : ${wsState}</p>
      <p>Nombre de clients connectés (client counts) : ${parties.length * joueursParPartie + clients.length}</p>
      <p>Ticks par seconde (ticks per second) : ${tick}/s</p>
      <p>Temps de traitements (processing times) : ${derniersTempsDeTraitements.map((x, i, a) => {
        return x + "ms ("+(i+1)+"/" + a.length +")";
      })}</p>
      <script>
        setTimeout(() => {
          window.location = window.location;
        }, 250)
      </script>
      </body>
  </html>`)
})

//lors de la fin du processus
process.on("exit", (code) => {
  //marquer le serveur comme fermé
  wss.close();
  //message de sortie
  console.log(
    "Le serveur c'est fermé avec le code d'arret : " +
      code +
      " (0 = arret normal, autre = erreur)"
  );
});
