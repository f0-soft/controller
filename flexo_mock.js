module.exports = {
	init: init,
	Collection: flexo_model_mock
};

function init(obj, callback){
	callback();
}

//Пустая функция конструктор модели
function flexo_model_mock(obj){
	var collection = {};
	collection.fields = obj.fields;
	collection.scheme = obj.scheme;
	collection.find = find;
	collection.insert = insert;
	collection.delete = del;
	collection.modify = modify;
	return collection;
}

function find(query, options, callback){
	//Анализируем параметры запроса
	var collection = {};
	collection._id = query.selector._id;
	collection.scheme = this.scheme;
	collection.text = query;
	//Массив данных:
	collection.data = [];
	//Массив колонок = [];
	collection.colNames = this.fields;

	callback(null, [collection]);
}

function insert(document, options, callback){
	callback(null, [{_id:'1'}]);
}

function del(query, options, callback){
	callback(null, [{_id:query.selector._id}]);
}

function modify(query, options, callback){
	callback(null, [{_id:query.selector._id}]);
}