var LibOfTestFunction = {};

var controller;
var libOfViews;
var _views;
var _flexos;

LibOfTestFunction.init = function init(controller, libOfViews, _views){
	_views

	return true;
};

LibOfTestFunction.simpleFind = function simpleFind(viewName, findOption, callback){

};

LibOfTestFunction.formingSimpleFindQuery = function formingSimpleFindQuery(viewName, flexoName, findOption) {

	if ( findOption === 'OneValAnyStrField' ) {
		//Ищем одно строковое поле
		var listOfStrFields = getListOfFlexoNameWithType( 'string', flexoName );
		var oneRandField = listOfStrFields[getRandom(0, (listOfStrFields.length - 1))];
		//Ищем viewId для этого поля
		var viewId =  getViewIdWithType('read', viewName, flexoName, oneRandField);

		if ( viewId ) {
			//Выбираем случайное значение из словарика данных для выбранной viewId
			var valueOfViewId =

			//Формируем запрос на чтение
			var request = {selector:{}};
			request.selector[viewName] = {};
			request.selector[viewName][viewId]
		} else {
			return false;
		}

		//Формируем запрос на чтение
		var request = { selector: {'testManager':{ m3:buffer.obj[1].managers['m5']} } };
	} else if ( findOption === 'OneValAnyNumField' ) {


	} else if ( findOption === 'SomeValAnyNumField' ) {

	}
};

function getListOfFlexoNameWithType( type, flexoName ) {
	var listOfFields = Object.keys( _flexos[flexoName] );
	var resultList = [];
	for( var i = 0; i < listOfFields.length; i++ ){
		if( _flexos[flexoName][listOfFields[i]].type === type ) {
			resultList.push(listOfFields[i]);
		}
	}

	return resultList;
}

function getViewIdWithType( type, viewName, flexoName, flexoFieldName ) {
	var listOfViewIds = Object.keys( _views[viewName] );
	for( var i=0; i < listOfViewIds.length; i++ ) {
		if( _views[viewName][listOfViewIds[i]]._flexo &&
			_views[viewName][listOfViewIds[i]]._flexo.type === type &&
			_views[viewName][listOfViewIds[i]]._flexo.scheme[0] === flexoName &&
			_views[viewName][listOfViewIds[i]]._flexo.scheme[1] === flexoFieldName ) {
			return listOfViewIds[i];
		}
	}

	return null;
}

//Создаем случайное число в заданных пределах
function getRandom(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

module.exports = LibOfTestFunction;

