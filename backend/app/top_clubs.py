TOP_300_CLUBS = [
    # España
    "Real Madrid", "Barcelona", "Atletico Madrid", "Sevilla", "Real Sociedad", 
    "Villarreal", "Real Betis", "Athletic Club", "Valencia", "Girona", "Celta Vigo", 
    "Osasuna", "Mallorca", "Getafe", "Alaves", "Rayo Vallecano", "Las Palmas", 
    "Granada", "Almeria", "Cadiz", "Espanyol", "Levante", "Eibar", "Valladolid",

    # Inglaterra
    "Manchester City", "Manchester United", "Liverpool", "Arsenal", "Chelsea", 
    "Tottenham", "Newcastle", "Aston Villa", "West Ham", "Brighton", "Everton", 
    "Crystal Palace", "Fulham", "Brentford", "Wolves", "Bournemouth", "Nottingham Forest",
    "Luton", "Sheffield United", "Burnley", "Leicester", "Leeds", "Southampton", "Norwich", "Watford",

    # Italia
    "Juventus", "AC Milan", "Inter Milan", "Inter", "Napoli", "Roma", "Lazio", 
    "Atalanta", "Fiorentina", "Bologna", "Torino", "Sassuolo", "Monza", "Genoa", 
    "Lecce", "Udinese", "Verona", "Empoli", "Salernitana", "Frosinone", "Cagliari", "Sampdoria", "Parma",

    # Alemania
    "Bayern Munich", "Borussia Dortmund", "Bayer Leverkusen", "RB Leipzig", 
    "Eintracht Frankfurt", "Wolfsburg", "Borussia Monchengladbach", "Stuttgart", 
    "Freiburg", "Union Berlin", "Mainz", "Hoffenheim", "Werder Bremen", "Augsburg",
    "Bochum", "Heidenheim", "Darmstadt", "Koln", "Schalke 04", "Hertha Berlin", "Hamburg",

    # Francia
    "PSG", "Paris Saint Germain", "Marseille", "Lyon", "Monaco", "Lille", "Rennes", 
    "Lens", "Nice", "Brest", "Reims", "Toulouse", "Montpellier", "Strasbourg", "Nantes",
    "Lorient", "Metz", "Le Havre", "Clermont", "Bordeaux", "Saint-Etienne",

    # Portugal & Paises Bajos & Belgica
    "Benfica", "Porto", "Sporting CP", "Braga", "Vitoria de Guimaraes", "Boavista", "Gil Vicente",
    "Ajax", "PSV", "Feyenoord", "AZ Alkmaar", "Twente", "Utrecht", "Vitesse",
    "Club Brugge", "Anderlecht", "Genk", "Union SG", "Gent", "Antwerp", "Standard Liege",
    
    # Turquia & Grecia & Escocia & Resto de Europa
    "Galatasaray", "Fenerbahce", "Besiktas", "Trabzonspor", "Basaksehir",
    "Olympiacos", "Panathinaikos", "AEK Athens", "PAOK", "Aris",
    "Celtic", "Rangers", "Hearts", "Aberdeen",
    "Red Bull Salzburg", "Sturm Graz", "LASK", "Rapid Wien",
    "Shakhtar Donetsk", "Dynamo Kyiv", "Dinamo Zagreb", "Hajduk Split", 
    "Copenhagen", "Midtjylland", "Brondby", "Nordsjaelland",
    "Slavia Prague", "Sparta Prague", "Viktoria Plzen",
    "Young Boys", "Basel", "Servette", "Lugano",
    "Maccabi Tel Aviv", "Maccabi Haifa", "Hapoel Be'er Sheva",
    "Red Star Belgrade", "Partizan", "Ferencvaros", "Ludogorets", "Qarabag", "Bodo/Glimt", "Molde", "Malmo FF",

    # Conmebol (Sudamérica)
    "Boca Juniors", "River Plate", "Racing Club", "Independiente", "San Lorenzo",
    "Estudiantes", "Rosario Central", "Talleres", "Velez Sarsfield", "Defensa y Justicia", "Argentinos Juniors", "Lanus",
    "Flamengo", "Palmeiras", "Sao Paulo", "Fluminense", "Gremio", "Atletico Mineiro", 
    "Corinthians", "Internacional", "Botafogo", "Cruzeiro", "Athletico Paranaense", "Vasco da Gama", "Santos", "Bahia", "Fortaleza", "Red Bull Bragantino",
    "Nacional", "Penarol", "Defensor Sporting", "Danubio", "Liverpool Montevideo",
    "Colo Colo", "Universidad de Chile", "Universidad Catolica", "Palestino", "Huachipato",
    "Olimpia", "Cerro Porteno", "Libertad", "Guarani",
    "LDU Quito", "Independiente del Valle", "Barcelona SC", "Emelec", "Aucas",
    "Atletico Nacional", "Millonarios", "America de Cali", "Junior", "Santa Fe", "Independiente Medellin",
    "Bolivar", "The Strongest", "Always Ready", "Sporting Cristal", "Alianza Lima", "Universitario", "Melgar",
    "Deportivo Tachira", "Caracas",

    # Concacaf (Norte y Centroamérica)
    "America", "Cruz Azul", "Monterrey", "Tigres", "Chivas", "Pachuca", "Pumas UNAM",
    "Leon", "Toluca", "Atlas", "Santos Laguna", "Tijuana",
    "Inter Miami", "Los Angeles FC", "LA Galaxy", "Seattle Sounders", "Columbus Crew",
    "Philadelphia Union", "FC Cincinnati", "New York City FC", "Atlanta United", "Orlando City", "Portland Timbers",
    "Saprissa", "Alajuelense", "Herediano", "Olimpia", "Motagua", "Comunicaciones", "Municipal", "Independiente CAI",

    # Asia y África
    "Al Hilal", "Al Nassr", "Al Ittihad", "Al Ahli", "Al Shabab", "Al Taawoun", "Al Ettifaq",
    "Urawa Red Diamonds", "Yokohama F. Marinos", "Kawasaki Frontale", "Vissel Kobe", "Sanfrecce Hiroshima", "Kashima Antlers",
    "Jeonbuk Hyundai", "Ulsan Hyundai", "Pohang Steelers", "FC Seoul", "Suwon Samsung",
    "Shanghai Port", "Shandong Taishan", "Beijing Guoan", "Guangzhou FC",
    "Al Ain", "Al Sadd", "Al Duhail", "Esteghlal", "Persepolis", "Sepahan",
    "Melbourne City", "Sydney FC", "Central Coast Mariners", "Auckland City",
    "Al Ahly", "Zamalek", "Pyramids FC", 
    "Wydad Casablanca", "Raja Casablanca", "RS Berkane",
    "Mamelodi Sundowns", "Orlando Pirates", "Kaizer Chiefs",
    "Esperance", "Etoile du Sahel", "Club Africain",
    "Simba SC", "Young Africans", "Petro de Luanda", "ASEC Mimosas", "CR Belouizdad", "USM Alger", "TP Mazembe"
]
