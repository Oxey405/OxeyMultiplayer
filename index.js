//(c) Oxey405 2022 - MIT license
//Comments formatted like this : french -- english
//Commentaires écrits en : français -- anglais
//Variables written in french for now

//On importe tous les modules dont ont a besoin
const WebSocket = require("ws");
const crypto = require("crypto");
/**
 * Plan de construction d'un objet "Message"
 * @param {Number} id identifiant "public" -- public id
 * @param {String} secret identifiant secret pour confirmer l'origine d'un message -- secret id to confirm message's origin
 * @param {Number} posX position X du joueur -- X pos of player
 * @param {Number} posY position Y du joueur -- Y pos of player
 * @param {Array} inventaire inventaire du joueur -- inventory of player
 */
class Message {
  constructor(id, secret, posX, posY, angle, inventaire, idPartie) {
    this.id = id;
    this.secret = secret;
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
 * @param {String} secret identifiant secret pour valider l'origine d'un message -- secret id to confirm message's origin
 */
class Client {
  constructor(id, secret, socket) {
    this.id = id;
    this.secret = secret;
    this.socket = socket;
  }

/**convertir l'objet en JSON -- Convert object to JSON*/
  toJSON() {
    return JSON.parse(
      `{"id":${this.id},"secret":"${this.secret}","type":"init"}`
    );
  }
  /**convertir l'objet en Texte -- Convert object to text JSON*/
  toString() {
    return `{"id":${this.id},"secret":"${this.secret}","type":"init"}`;
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
//Evenement qui s'active lorsqu'une connection est détectée -- This event activate whenever a client connects
wss.on("connection", (client) => {
  //on lui donne son identifiant dans un format JSON converti en texte -- give client an ID in JSON texy
  let identifiant = clients.length + 1;
  //on génère un hash (basiquement une longue valeur binaire) que l'on convertie en texte hexadécimal et que l'on coupe pour prendre les 16 premiers caractèrs
  //We create a hash (basically a LONG binary value) converted in hexadecimal text and cutted out to the first 16 characters
  let secret = crypto
    .createHash("sha256")
    .update(crypto.randomBytes(16))
    .digest()
    .toString("hex")
    .substring(0, 16); //L'index de la première lettre est 0 comme dans tous les languages de programmation -- the index of the first letter is 0 like in every programming language

  //on créé un nouveau client -- creating a NEW client.
  let clientCree = new Client(identifiant, secret, client);

  //on ajoute le client à la liste des clients connectés -- adding client to clients list
  clients.push(clientCree);
  let donnesAEnvoyer = clientCree.toString();
  client.send(donnesAEnvoyer.toString());
  //on envoie un message dans la console. -- Log the fact that a client connected in console
  console.log(
    "🎮 Nouveau joueur connecté. (ID: " +
      identifiant +
      ", secret : " +
      secret +
      ")"
  );
  //si on a deux clients, on les mets dans une partie -- if there are twos clients, we init a game
  if (clients.length == 2) {
    let partie = new Partie(clients, "playing");
    parties.push(partie);

    clients = [];
    console.log(
      "🎮 2 joueurs connectés : début de la partie (ID #" +
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
    //à faire : anti-triche

    //on vérifie que le message contient uniquement des bonnes informations
    /**
     * Liste des codes d'erreurs -- error codes :
     * 001 : Impossible de formatter l'entrée  -- Cannot format input
     * 002 : Pas de données reçues -- No data recieved
     * 003 : Données invalides -- Invalid data
     * 004 : Mauvaise origine -- Wrong origin (sender)
     */

    //1. vérifier que le message n'est pas vide
    if ((message.length = "")) {
      client.send(`{"error":002,"type":"error"}`);
      return;
    }
    //2. Formatter le message
    let messageFormate;
    try {
      //on ESSAIE (try) de formatter le message
      messageFormate = JSON.parse(message);
    } catch (error) {
      //Si il y a une erreur, on l'attrape (catch)
      //et on renvoie un code d'erreur au client formatté en JSON mais en texte
      client.send(`{"error":001,"type":"error"}`);
      //puis on l'affiche dans la console
      console.log(error);
    }
    //3. Mettre le message dans un objet Message
    let msgCorrect;
    try {
      //tenter de mettre le message reçu dans son objet "Message"
      //le but de cette action est de garder UNIQUEMENT les données qui nous intéressent et éviter de l'injection de données non voulues.
      msgCorrect = new Message(
        messageFormate.id,
        messageFormate.secret,
        messageFormate.posX,
        messageFormate.posY,
        messageFormate.angle,
        messageFormate.inventaire,
        messageFormate.idPartie
      );
    } catch (error) {
      client.send(`{"error":003,"type":"error"}`);
      console.log("le message envoyé n'est pas valide");
      return;
    } finally {
    
      //trouver la partie correspondante dans la liste
      for (let i = 0; i < parties.length; i++) {
        const partie = parties[i];
        if (partie.idPartie == msgCorrect.idPartie) {
            //Vérifier si l'envoyeur a le bon secret
            for (let z = 0; z < partie.clients.length; z++) {
              const clientActuel = partie.clients[z];
              //prendre le client avec le bon ID
              if(clientActuel.id == msgCorrect.id) {
                // si l'ID ne correspond pas au secret alors le message n'a pas d'origine valide -- if the ID of the sender doesn't match with the sender's secret then message has no valid origin
                //A-FAIRE : Préferer utiliser la méthode de signature numérique cryptographique. -- TO-DO: use cryptographical signing
                if(clientActuel.secret !== msgCorrect.secret) {
                  client.send(`{"error":003,"type":"error"}`);
                  return;
                }
              }
            }
          //pour chaque instance des clients connectés
          partie.clients.forEach((instanceDeClient) => {
            //supprimer le secret de l'autre client
            let msgAEnvoyer = msgCorrect.toJSON();
            msgAEnvoyer.secret = "";
            //pour tout les clients connectés qui ne sont pas celui qui a envoyé le message
            if (instanceDeClient.socket != client) {
              //transmettre le message aux clients
              instanceDeClient.socket.send(JSON.stringify(msgAEnvoyer));
            }
          });
          tick++;
        }
      }
    }
  });

  //lors d'une déconnection d'un client
  // client.on('close', () => {
  //   //si le client est déconnecté, on le supprime
  //   console.log("client déconnecté... suppression de sa connection...");
  //   for (let i = 0; i < clients.length; i++) {
  //     const clientActuel = clients[i];
  //     if(clientActuel.socket == client) {
  //       clients.splice(i, 1);
  //       console.log("le client n°" + (clientActuel.id) + " a été supprimé.");
  //       return;
  //     } else {
  //       continue;
  //     }
  //   }
  //   console.log("action finie...")
  // })
});

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
