module.exports = ModelView;

/**
 * Конструктор модели view
 *
 * @constructor
 * @param client - объект redis клиент
 */

function ModelView( client ) {
	this.client = client;
	return this;
}

/**
 * Создаем данных о меню с правами и сохраняем в redis
 *
 * @param viewName - строка название view
 * @param odjView - объект c общими данными о view
 * @param callback
 * 		err - ошибки от node_redis и ...
 * 		reply - возвращается true в случае успешного создания
 */
ModelView.prototype.create = function create(viewName, odjView, callback ) {
	var multi = this.client.multi();

	var schemesFlexo = Object.keys(odjView);

	for( var i=0; i<schemesFlexo.length; i++ ){
		multi.SADD(setViewToFlexoSchemes(viewName), schemesFlexo[i]);
		multi.SET(setViewToFlexoSchemes( viewName, schemesFlexo[i]), JSON.stringify(odjView[schemesFlexo[i]]));
		//ToDo:временно
		multi.SADD(setAllAccess(), setViewToFlexoSchemes( viewName, schemesFlexo[i]));
	}
	multi.SADD(setAllAccess(), setViewToFlexoSchemes(viewName));

	multi.EXEC(function( err ){
		if(err){
			callback( err );
		} else {
			callback( null, true );
		}
	});
};

ModelView.prototype.find = function find(viewName, callback){
	var self = this;
	this.client.SMEMBERS(setViewToFlexoSchemes(viewName), function( err, flexoSchemes ){
		if( err ){
			callback ( err );
		} else {
			var multi = self.client.multi();
			for(var i=0; i<flexoSchemes.length; i++){
				multi.GET(setViewToFlexoSchemes(viewName, flexoSchemes[i]));
			}

			multi.EXEC(function( err, replies ){
				if(err){
					callback( err );
				} else {
					var obj = {};
					for(var i=0; i<replies.length; i++){
						obj[flexoSchemes[i]] = JSON.parse(replies[i]);
					}
					callback(null, obj);
				}
			});
		}
	});
};

ModelView.prototype.findViewFlexoShemes = function findViewFlexoShemes(viewName, callback){
	this.client.SMEMBERS(setViewToFlexoSchemes(viewName), callback);
};


//Формирование строки ключа Redis (SET) для хранения ссылок на все схемы flexo для данной view
function setViewToFlexoSchemes( viewName ) {
	return 'view:flexoSchemes' + viewName ;
}

//Формирование строки ключа Redis (STRING) для хранения массива полей относящихся к данной flexo и view
function setViewToFlexoSchemes( viewName, flexoSchemeName ) {
	return 'view:fieldsFromflexoScheme' + viewName + ':' +  flexoSchemeName;
}

//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}