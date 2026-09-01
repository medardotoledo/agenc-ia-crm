-- ════════════════════════════════════════════════════════════════
-- CATÁLOGO MÉXICO — Estados y Ciudades (datos de referencia globales)
-- ════════════════════════════════════════════════════════════════
-- Tablas compartidas por TODAS las instancias (no llevan account_id).
-- Lectura pública; nadie escribe desde el cliente.
-- IDs de estado = clave INEGI (1-32). Re-ejecutable (hace TRUNCATE).
--
-- Correr en: Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mx_states (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT
);

CREATE TABLE IF NOT EXISTS mx_cities (
  id       SERIAL PRIMARY KEY,
  state_id INTEGER NOT NULL REFERENCES mx_states(id),
  name     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mx_cities_state ON mx_cities(state_id);

-- Seguridad: lectura pública, sin escritura desde cliente
ALTER TABLE mx_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE mx_cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mx_states_read ON mx_states;
CREATE POLICY mx_states_read ON mx_states FOR SELECT USING (true);
DROP POLICY IF EXISTS mx_cities_read ON mx_cities;
CREATE POLICY mx_cities_read ON mx_cities FOR SELECT USING (true);

-- Limpiar para re-ejecución segura
TRUNCATE mx_cities, mx_states RESTART IDENTITY CASCADE;

-- ───────────────────────── ESTADOS (clave INEGI) ─────────────────────────
INSERT INTO mx_states (id, name, code) VALUES
(1,'Aguascalientes','AGS'),
(2,'Baja California','BC'),
(3,'Baja California Sur','BCS'),
(4,'Campeche','CAMP'),
(5,'Coahuila','COAH'),
(6,'Colima','COL'),
(7,'Chiapas','CHIS'),
(8,'Chihuahua','CHIH'),
(9,'Ciudad de México','CDMX'),
(10,'Durango','DGO'),
(11,'Guanajuato','GTO'),
(12,'Guerrero','GRO'),
(13,'Hidalgo','HGO'),
(14,'Jalisco','JAL'),
(15,'Estado de México','MEX'),
(16,'Michoacán','MICH'),
(17,'Morelos','MOR'),
(18,'Nayarit','NAY'),
(19,'Nuevo León','NL'),
(20,'Oaxaca','OAX'),
(21,'Puebla','PUE'),
(22,'Querétaro','QRO'),
(23,'Quintana Roo','QROO'),
(24,'San Luis Potosí','SLP'),
(25,'Sinaloa','SIN'),
(26,'Sonora','SON'),
(27,'Tabasco','TAB'),
(28,'Tamaulipas','TAMS'),
(29,'Tlaxcala','TLAX'),
(30,'Veracruz','VER'),
(31,'Yucatán','YUC'),
(32,'Zacatecas','ZAC');

-- ───────────────────────── CIUDADES PRINCIPALES ─────────────────────────
INSERT INTO mx_cities (state_id, name) VALUES
-- 1 Aguascalientes
(1,'Aguascalientes'),(1,'Jesús María'),(1,'Calvillo'),(1,'Rincón de Romos'),(1,'Pabellón de Arteaga'),(1,'San Francisco de los Romo'),(1,'Asientos'),(1,'Cosío'),(1,'Tepezalá'),
-- 2 Baja California
(2,'Tijuana'),(2,'Mexicali'),(2,'Ensenada'),(2,'Tecate'),(2,'Playas de Rosarito'),(2,'San Felipe'),
-- 3 Baja California Sur
(3,'La Paz'),(3,'Cabo San Lucas'),(3,'San José del Cabo'),(3,'Ciudad Constitución'),(3,'Loreto'),(3,'Santa Rosalía'),(3,'Todos Santos'),
-- 4 Campeche
(4,'San Francisco de Campeche'),(4,'Ciudad del Carmen'),(4,'Champotón'),(4,'Escárcega'),(4,'Calkiní'),(4,'Hecelchakán'),
-- 5 Coahuila
(5,'Saltillo'),(5,'Torreón'),(5,'Monclova'),(5,'Piedras Negras'),(5,'Ciudad Acuña'),(5,'Ramos Arizpe'),(5,'Sabinas'),(5,'San Pedro'),(5,'Matamoros'),(5,'Frontera'),
-- 6 Colima
(6,'Colima'),(6,'Manzanillo'),(6,'Villa de Álvarez'),(6,'Tecomán'),(6,'Comala'),(6,'Cuauhtémoc'),(6,'Armería'),
-- 7 Chiapas
(7,'Tuxtla Gutiérrez'),(7,'Tapachula'),(7,'San Cristóbal de las Casas'),(7,'Comitán'),(7,'Chiapa de Corzo'),(7,'Palenque'),(7,'Ocosingo'),(7,'Tonalá'),
-- 8 Chihuahua
(8,'Chihuahua'),(8,'Ciudad Juárez'),(8,'Delicias'),(8,'Cuauhtémoc'),(8,'Hidalgo del Parral'),(8,'Nuevo Casas Grandes'),(8,'Camargo'),(8,'Jiménez'),
-- 9 Ciudad de México (alcaldías)
(9,'Álvaro Obregón'),(9,'Azcapotzalco'),(9,'Benito Juárez'),(9,'Coyoacán'),(9,'Cuajimalpa de Morelos'),(9,'Cuauhtémoc'),(9,'Gustavo A. Madero'),(9,'Iztacalco'),(9,'Iztapalapa'),(9,'La Magdalena Contreras'),(9,'Miguel Hidalgo'),(9,'Milpa Alta'),(9,'Tláhuac'),(9,'Tlalpan'),(9,'Venustiano Carranza'),(9,'Xochimilco'),
-- 10 Durango
(10,'Durango'),(10,'Gómez Palacio'),(10,'Lerdo'),(10,'Santiago Papasquiaro'),(10,'El Salto'),(10,'Canatlán'),
-- 11 Guanajuato
(11,'León'),(11,'Irapuato'),(11,'Celaya'),(11,'Salamanca'),(11,'Guanajuato'),(11,'San Miguel de Allende'),(11,'Silao'),(11,'Dolores Hidalgo'),(11,'Pénjamo'),(11,'San Francisco del Rincón'),(11,'Acámbaro'),(11,'Valle de Santiago'),
-- 12 Guerrero
(12,'Acapulco'),(12,'Chilpancingo'),(12,'Iguala'),(12,'Zihuatanejo'),(12,'Taxco'),(12,'Chilapa'),(12,'Tlapa'),(12,'Ayutla de los Libres'),
-- 13 Hidalgo
(13,'Pachuca'),(13,'Tulancingo'),(13,'Tula de Allende'),(13,'Tizayuca'),(13,'Huejutla'),(13,'Ixmiquilpan'),(13,'Actopan'),(13,'Tepeji del Río'),(13,'Mineral de la Reforma'),
-- 14 Jalisco
(14,'Guadalajara'),(14,'Zapopan'),(14,'San Pedro Tlaquepaque'),(14,'Tonalá'),(14,'Tlajomulco de Zúñiga'),(14,'Puerto Vallarta'),(14,'El Salto'),(14,'Lagos de Moreno'),(14,'Tepatitlán'),(14,'Ocotlán'),(14,'Chapala'),(14,'Ciudad Guzmán'),
-- 15 Estado de México
(15,'Toluca'),(15,'Ecatepec'),(15,'Nezahualcóyotl'),(15,'Naucalpan'),(15,'Tlalnepantla'),(15,'Chimalhuacán'),(15,'Cuautitlán Izcalli'),(15,'Atizapán de Zaragoza'),(15,'Tultitlán'),(15,'Coacalco'),(15,'Valle de Chalco'),(15,'Chalco'),(15,'Metepec'),(15,'Texcoco'),(15,'Ixtapaluca'),(15,'Nicolás Romero'),(15,'Tecámac'),(15,'Huixquilucan'),(15,'Lerma'),(15,'Zinacantepec'),
-- 16 Michoacán
(16,'Morelia'),(16,'Uruapan'),(16,'Zamora'),(16,'Lázaro Cárdenas'),(16,'Apatzingán'),(16,'Zitácuaro'),(16,'La Piedad'),(16,'Pátzcuaro'),(16,'Sahuayo'),(16,'Ciudad Hidalgo'),
-- 17 Morelos
(17,'Cuernavaca'),(17,'Jiutepec'),(17,'Cuautla'),(17,'Temixco'),(17,'Yautepec'),(17,'Jojutla'),(17,'Emiliano Zapata'),(17,'Xochitepec'),(17,'Puente de Ixtla'),(17,'Tepoztlán'),(17,'Ayala'),
-- 18 Nayarit
(18,'Tepic'),(18,'Bahía de Banderas'),(18,'Santiago Ixcuintla'),(18,'Compostela'),(18,'Xalisco'),(18,'Tuxpan'),(18,'Acaponeta'),(18,'Ixtlán del Río'),
-- 19 Nuevo León
(19,'Monterrey'),(19,'Guadalupe'),(19,'San Nicolás de los Garza'),(19,'Apodaca'),(19,'General Escobedo'),(19,'Santa Catarina'),(19,'San Pedro Garza García'),(19,'Juárez'),(19,'García'),(19,'Cadereyta Jiménez'),(19,'Montemorelos'),(19,'Linares'),(19,'Santiago'),
-- 20 Oaxaca
(20,'Oaxaca de Juárez'),(20,'Salina Cruz'),(20,'Juchitán de Zaragoza'),(20,'San Juan Bautista Tuxtepec'),(20,'Huajuapan de León'),(20,'Santa Cruz Xoxocotlán'),(20,'Puerto Escondido'),(20,'Santa Lucía del Camino'),(20,'Tlacolula'),
-- 21 Puebla
(21,'Puebla'),(21,'Tehuacán'),(21,'San Martín Texmelucan'),(21,'Atlixco'),(21,'San Pedro Cholula'),(21,'San Andrés Cholula'),(21,'Amozoc'),(21,'Cuautlancingo'),(21,'Teziutlán'),(21,'Izúcar de Matamoros'),(21,'Huauchinango'),
-- 22 Querétaro
(22,'Santiago de Querétaro'),(22,'San Juan del Río'),(22,'Corregidora'),(22,'El Marqués'),(22,'Tequisquiapan'),(22,'Pedro Escobedo'),(22,'Cadereyta de Montes'),(22,'Ezequiel Montes'),(22,'Amealco'),
-- 23 Quintana Roo
(23,'Cancún'),(23,'Chetumal'),(23,'Playa del Carmen'),(23,'Cozumel'),(23,'Tulum'),(23,'Isla Mujeres'),(23,'Felipe Carrillo Puerto'),(23,'Bacalar'),
-- 24 San Luis Potosí
(24,'San Luis Potosí'),(24,'Soledad de Graciano Sánchez'),(24,'Ciudad Valles'),(24,'Matehuala'),(24,'Rioverde'),(24,'Tamazunchale'),(24,'Ciudad Fernández'),
-- 25 Sinaloa
(25,'Culiacán'),(25,'Mazatlán'),(25,'Los Mochis'),(25,'Guasave'),(25,'Guamúchil'),(25,'Navolato'),(25,'El Fuerte'),(25,'Escuinapa'),
-- 26 Sonora
(26,'Hermosillo'),(26,'Ciudad Obregón'),(26,'Nogales'),(26,'San Luis Río Colorado'),(26,'Navojoa'),(26,'Guaymas'),(26,'Caborca'),(26,'Agua Prieta'),(26,'Puerto Peñasco'),(26,'Empalme'),
-- 27 Tabasco
(27,'Villahermosa'),(27,'Cárdenas'),(27,'Comalcalco'),(27,'Huimanguillo'),(27,'Macuspana'),(27,'Tenosique'),(27,'Paraíso'),(27,'Cunduacán'),
-- 28 Tamaulipas
(28,'Reynosa'),(28,'Matamoros'),(28,'Nuevo Laredo'),(28,'Tampico'),(28,'Ciudad Victoria'),(28,'Ciudad Madero'),(28,'Altamira'),(28,'Río Bravo'),(28,'El Mante'),(28,'Valle Hermoso'),
-- 29 Tlaxcala
(29,'Tlaxcala'),(29,'Apizaco'),(29,'Huamantla'),(29,'Chiautempan'),(29,'San Pablo del Monte'),(29,'Calpulalpan'),(29,'Zacatelco'),(29,'Contla'),
-- 30 Veracruz
(30,'Veracruz'),(30,'Xalapa'),(30,'Coatzacoalcos'),(30,'Córdoba'),(30,'Poza Rica'),(30,'Orizaba'),(30,'Minatitlán'),(30,'Boca del Río'),(30,'Tuxpan'),(30,'Martínez de la Torre'),(30,'San Andrés Tuxtla'),(30,'Acayucan'),(30,'Cosoleacaque'),
-- 31 Yucatán
(31,'Mérida'),(31,'Valladolid'),(31,'Tizimín'),(31,'Progreso'),(31,'Kanasín'),(31,'Umán'),(31,'Motul'),(31,'Ticul'),(31,'Izamal'),
-- 32 Zacatecas
(32,'Zacatecas'),(32,'Fresnillo'),(32,'Guadalupe'),(32,'Jerez'),(32,'Río Grande'),(32,'Sombrerete'),(32,'Loreto'),(32,'Calera'),(32,'Pinos');

-- Verificar
SELECT (SELECT COUNT(*) FROM mx_states) AS estados,
       (SELECT COUNT(*) FROM mx_cities) AS ciudades;
