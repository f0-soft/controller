Controller
=====
## Инсталяция:
* один раз выполнить настройки Linux указанный по ссылке https://github.com/f0-soft/wiki/wiki/Npm-install-from-private-github
* запустить команду: npm install git+ssh://git@github.com:f0-soft/controller.git
* контроллер будет находится в node_modules/f0.controller

## Тестирование:
* включить mock view (изменить в файле config/config.js значения объекта mock на {view:true}, для отключения необходимо эти значения поменять на false)
* запустить test/test.js
!!! mock view работает формально (не сохраняет документы)


## Подключение:
var Controller = require('controller');

## init( config, callback )
Запускает инициализацию контроллера:
* создание клиента redis
* сохранение ссылки на инициализированную view или на её mock
* сохранение ссылки на объект с данными из схем flexo коллекций
* сохранение ссылки на объект с данными схемы меню
* сохранение ссылки на объект с данными схемы form

Параметры:
* config - объект с параметрами
    * [redisConfig] — объект хранящий в себе параметры подключения к Redis
        * config.port — число, порт Redis
        * config.host — строка, хост Redis
        * [config.max_attempts] — число, количество попыток подключения
    * view - ccылка на проинициализированную view
    * viewConfig - объкт с описание _vid во view с указанием данных об используемых flexo в виде: {viewName:{_vid:{flexo:[flexoSchemeName, fieldName], type:'read/modify/create/delete'}}}, где viewName - свойство объекта с переменным именем, название view; _vid - свойство объекта с переменным именем, идентификатор элемента view; flexo - название поля объекта, содержит в себе массив первым элементом которого обезательно указывается имя flexo схемы (flexoSchemeName) , последующие элементы это названия полей (при create и delete может быть не обезательным); type - название поля объекта, содержащая в себя строку 'read' или 'modify', в зависимотсти от типа операции с БД.
    * flexoSchemes - объект с описанием flexo схем в виде: {nameFlexoScheme:{read:[], modify:[], readForAdminPanel:[[fieldName1, title1, description1], ...], modifyForAdminPanel:[[fieldName1, title1, description1], ...]}}, где nameFlexoScheme - свойство объекта с переменным именем, имя flexo cхемы; read - название поля объекта, содержащий массив полей разрешенных читать; modify - название поля объекта, содержащий массив полей разрешенных модифицировать, readForAdminPanel - массив из массивов содержащий информацию о flexo полях доступных на чтение и необходимых для построения шаблона в админке, modifyForAdminPanel - массив из массивов содержащий информацию о flexo полях доступных на модификацию и необходимых для построения шаблона в админке, fieldName1 - название flexo поля, title - русское название поля, description1 - примечание (описание поля).
* callback (err, reply) - функция обратного вызова
    * err - ошибка подключения к Redis от node_redis
    * reply - логическое, возвращается true в случае успешной инициализации контроллера.

## Примеры объектов прав для view и flexo
Шаблон объекта прав для view по роли (объект прав обезательно содержит спец. команду '(all)', и 'viewIds'):
* '(all)' - число, 0 - если запрещены все viewId, 1 - если разрешены все viewId
* 'viewIds' - массив, содержит в себе список идентификаторов которые выступают в качестве исключения из правила установленное командой '(all)'
* '(useId)' - число, 0 - если не нужно сужать данные по идентификатору пользователя, 1 - если нужно сужать данные по идентификатору пользователя

Примеры объекта прав для view по роли:
'''
    var testObjAccess1 = {
        '(all)':0,
        'viewIds':['a1', 'f2', ...],
        '(useId)':0
    };
    var testObjAccess2 = {
        '(all)':1,
        'viewIds':[],
        '(useId)':1
    };
'''

Шаблон объекта прав для view по пользователю (объект прав обезательно содержит 'viewIdsAdd' и 'viewIdsDel'):
* ['(all)'] - число, 0 - если запрещены все viewId, 1 - если разрешены все viewId
* 'viewIdsAdd' - массив, содержит в себе список идентификаторов которые разрешены
* 'viewIdsDel' - массив, содержит в себе список идентификаторов которые запрещены
* ['(useId)'] - число, 0 - если не нужно сужать данные по идентификатору пользователя, 1 - если нужно сужать данные по идентификатору пользователя

Примеры объекта прав для view по пользователю:
'''
    var testObjAccess1 = {
        '(all)':0,
        'viewIdsAdd':['a1', 'f2', ...],
        'viewIdsDel':[]
    };
    var testObjAccess2 = {
        '(all)':1,
        'viewIdsAdd':[],
        'viewIdsDel':['a1', 'f2', ...],
        '(useId)':1
    };
    var testObjAccess3 = {
        'viewIdsAdd':['b1', 'g2', ...],
        'viewIdsDel':['a1', 'f2', ...],
        '(useId)':0
    };
'''

Шаблон объекта прав для одной flexo схемы по роли:
{read: { '(all)': access, 'fields': [] }, modify: { '(all)': access, 'fields': [] }, create: { '(all)': access, 'fields': [] }, createAll:access, delete: access}, где:
* [read] - объект, содержащий в себе поля flexo c указанием доступа на чтение (обезательно содержит спец. команду '(all)'  и 'fields')
* [modify] - объект, содержащий в себе поля flexo c указанием доступа на модификацию (обезательно содержит спец. команду '(all)' и 'fields')
* [create] - объект, содержащий в себе поля flexo c указанием доступа на создание (обезательно содержит спец. команду '(all)' и 'fields')
* [createAll] - числовой, содержит в себе разрешение на создание flexo документа в целом (если явно не указан, значение будет проставлено автоматически)
* [delete] - числовой, содержит в себе разрешение на удаление flexo документа в целом
* '(all)'  - число, 0 - если запрещены все поля flexo, 1 - если разрешены все поля flexo
* 'fields' - массив, содержит в себе список flexo полей которые выступают в качестве исключения из правила установленное командой '(all)'

Пример объекта прав для flexo:
'''
    var testObjAccess = {
        read: {
            '(all)':0,
            'fields':['field1', 'field2', ...]
        },
        modify: {
            '(all)':1,
            'fields':[]
        },
        create: {
            '(all)':1,
            'fields':['field1', 'field2', ...]
        },
        createAll: 0,
        delete: 1
    };
'''

Шаблон объекта прав для одной flexo схемы по пользоватлю:
{read: { '(all)': access, 'fieldsAdd': [], 'fieldsDel': [] }, modify: { '(all)': access, 'fieldsAdd': [], 'fieldsDel': [] }, create: { '(all)': access, 'fieldsAdd': [], 'fieldsDel': [] }, createAll:access, delete: access}, где:
* [read] - объект, содержащий в себе поля flexo c указанием доступа на чтение (обезательно содержит спец. команду '(all)'  и 'fields')
* [modify] - объект, содержащий в себе поля flexo c указанием доступа на модификацию (обезательно содержит спец. команду '(all)' и 'fields')
* [create] - объект, содержащий в себе поля flexo c указанием доступа на создание (обезательно содержит спец. команду '(all)' и 'fields')
* [createAll] - числовой, содержит в себе разрешение на создание flexo документа в целом (если явно не указан, значение будет проставлено автоматически)
* [delete] - числовой, содержит в себе разрешение на удаление flexo документа в целом
* ['(all)']  - число, 0 - если запрещены все поля flexo, 1 - если разрешены все поля flexo
* 'fieldsAdd' - массив, содержит в себе список flexo полей которые разрешены
* 'fieldsDel' - массив, содержит в себе список flexo полей которые запрещены


Пример объекта прав для flexo:
'''
    var testObjAccess = {
        read: {
            '(all)':0,
            'fieldsAdd':['field1', 'field2', ...],
            'fieldsDel':[]
        },
        modify: {
            'fieldsAdd':['field1', 'field2', ...],
            'fieldsDel':['field8', 'field9', ...]
        },
        create: {
            '(all)':1,
            'fieldsAdd':[],
            'fieldsDel':['field1', 'field2', ...]
        },
        createAll: 0,
        delete: 1
    };
'''

## find( query, sender, callback )
Читает запрашиваемые права или данные пользователя, а именно:
* проверяется наличие необходимых параметров в запросе для поиска
* при поиске прав:
    * создается модель прав и осуществляется поиск объекта прав
* при поиске данных о пользователе:
    * простой запрос по id или логину возвращаются кеш с данными из redis


Параметры:
* query - объект запрос
    * [user] - объект содержащий параметры поиска пользователя
        * [login]/[_id] - строка, логин пользователя или идентификатор пользователя для организациия простого поиска пользователя из redis (например, для получения сведеней о пользователе при его аутентификации)
        * [allObjRole] - логический, если true то требуется вернуть массив с данными о всех ролях
        * [allRole] - логический, если true то требется вернуть список ролей
        * [allObjUser] - логический, если true то требуется вернуть массив с данными о всех пользователей
        * [allUser] - логический, если true то требуется вернуть список пользователей
        * [allView]/[allFlexo] - логический, опция (работает, только при запросе списка ролей или пользователей) позволяющая вернуть третим аргументов в функции обратного вызова массив названия всех flexo или view доступных в глобальном описании
        * [allViewsUser] - строка, содержит login пользователя, данная опция позволяет вернуть список view у которых есть права связанные с этип пользователем
        * [allFlexosUser] - строка, содержит login пользователя, данная опция позволяет вернуть список flexo у которых есть права связанные с этип пользователем
        * [allViewsRole] - строка, содержит role пользователя, данная опция позволяет вернуть список view у которых есть права связанные с этой ролью
        * [allFlexosRole] - строка, содержит role пользователя, данная опция позволяет вернуть список flexo у которых есть права связанные с этип ролью
    * [access] - объект содержащий параметры поиска прав доступа
        * flexoSchemeName/viewName - строка, название flexo схемы или view
        * role/login - строка, роль или логин пользователя искомого объекта прав
* sender - объект с информацией о пользователе от которого пришел запрос c указанием откуда пришел запрос
    * login - строка, логин пользователя
    * [role] - строка, роль пользователя
    * [userId] - строка, идентификатор пользователя
    * [place] - cтрока, название view от которого пришел запрос
* callback(err, reply, allFlexo/allView) — функция обратного вызова
    * err - ...
    * reply - возвращается объект с информацией о пользователе, или запрашиваемые объект прав, при сложном запросе данных о пользователе возвращается массив объектов
    * [allFlexo]/[allView] - при запросе объекта прав flexo или view, возвращается объект описание flexo или массив идентификаторов view из глобального конфига, при запросе списка пользователей или ролей, то в этом аргументе возвращается массив названия всех flexo или view доступных в глобальном описании

## delete( query, sender, callback )
Удаляем пользователя или объект прав
* проверяется наличие необходимых параметров в запросе для удаления
* при удалении прав:
    * создается модель прав и осуществляется её удаление
* при удалении пользователя (нет взаимодействия с mongo):
    * осуществляется удаление из redis

Параметры:
* query - объект запрос
    * [user] - объект содержащий параметры удаления пользователя, объект содержит _id или login удаляемого пользователя
    * [role] - строка, название роли, опция задается при удалении только роли
    * [access] - объект содержащий параметры удаления прав доступа
        * flexoSchemeName/viewName - строка, название flexo схемы или view
        * role/login - строка, роль удаляемого объекта прав или логин пользователя
* sender - объект с информацией о пользователе от которого пришел запрос c указанием откуда пришел запрос
    * login - строка, логин пользователя
    * role - строка, роль пользователя
    * userId - строка, идентификатор пользователя
    * [place] - cтрока, название view от которого пришел запрос
* callback(err, reply) — функция обратного вызова
    * err - ...
    * reply - возвращается логическое true при успешном выполнении операции

## create( query, sender, callback )
Создаем пользователя или объект прав
* проверяется наличие неоходимых параметров в запросе для создания
* при создании объекта прав:
    * создается модель прав, наполняем её пришедшими данными и сохраняем в redis
* при создании пользователя (нет взаимодействия c view):
    * проверяется уникальность создаваемого пользователя
    * сохраняются данные в redis
* при создании роли:
    * сохраняется роль в redis

Параметры:
* query - объект запрос
    * [user] - объект содержащий запрос на создание пользователя в виде {queries:{flexoSchemeName:{fieldsName:value}}
    * [role] - объект, с описанием роли
        * roleName - строка, название роли
        * [commentRole] - строка, примечание к роли
    * [access] - объект содержащий параметры создания прав доступа
        * flexoSchemeName/viewName - строка, название flexo схемы или view
        * role/login - строка, роль или логин пользователя создаваемого объекта прав
        * objAccess - объект с описание прав доступа
* sender - объект с информацией о пользователе от которого пришел запрос c указанием откуда пришел запрос
    * login - строка, логин пользователя
    * role - строка, роль пользователя
    * userId - строка, идентификатор пользователя
    * [place] - cтрока, название view от которого пришел запрос
* callback(err, reply) — функция обратного вызова
    * err - ...
    * reply - возвращается логическое true при успешном выполнении операции, при создании пользователя возвращается _id созданного пользователя

## modify( query, sender, callback )
Модификация данных пользователя или объекта прав
* проверяется наличие необходимых параметров в запросе для модификации
* при модификации объекта прав:
    * тоже что и при create (создается модель прав, наполняем её пришедшими данными и сохраняем в redis)
* при модификации пользователя (нет модификации в mobgo):
    * вносятся изменения в кеш не затрагивая поле _id
    * сохраняется измененный кеш в redis

Параметры:
* query - объект запрос
    * [user] - объект запрос на изменение данных о пользователе, объект содержащий только измененные данные о пользователе в виде {fieldName:value}
    * [access] - объект содержащий параметры модификации прав доступа
        * flexoSchemeName/viewName - строка, название flexo схемы или view
        * role/login - строка, роль или логин пользователя модифицируемого объекта прав
        * objAccess - объект с описание прав доступа
* sender - объект с информацией о пользователе от которого пришел запрос c указанием откуда пришел запрос
    * login - строка, логин пользователя
    * role - строка, роль пользователя
    * userId - строка, идентификатор пользователя
    * [place] - cтрока, название view от которого пришел запрос
* callback(err, reply) — функция обратного вызова
    * err - ...
    * reply - возвращается логическое true при успешном выполнении операции, при модификации пользователя возвращается _id пользователя

## getTemplate ( viewName, sender, socket, callback )
Обрабатываем запрос для получения шаблона view:
* создаем модели прав на view по роли и по пользователю определяем пересечение прав по которому определяем перечень разрешенных идентификаторов view
* создаем модели прав по роли и по пользователю на flexo схемы входящие во view и находим их пересечения, по определенным пересечениям прав уточняем список разрешенных идентификаторов view
* сформированный массив разрешенных идентификаторов передаем во view
* получаем от view список разрешенных _vid и прикрепляем их к объекту socket
* получаем от view шаблон и/или конфиг и возвращаем их в колбэке

Параметры:
* [name] - строка, имя view
* sender - объект с информацией о пользователе от которого пришел запрос c указанием откуда пришел запрос
    * login - строка, логин пользователя
    * role - строка, роль пользователя
    * userId - строка, идентификатор пользователя
    * [place] - cтрока, название view от которого пришел запрос
* socket - объект сокета
* callback (err, config, template) — функция обратного вызова
    * err - ошибка работы с Redis от node_redis, отсутствие прав, ошибки от view
    * config - объект, содержит клиентский конфиг
    * template - строка, содержит клиентский шаблон

## queryToView ( type, sender, request, viewName, socket, callback )
Обрабатывает запросы по работе с данными из view:
* проверяется наличия готового пересечения разрешенных _vid для view прикрепленного к socket
* проверяем права на чтение, модификацию, удаление, изменение в зависимости от типа запроса, а именно:
    * при проверке чтения, проверяются идентификаторы _vid для view в объекте request.selector и request.options.sort на их разрешение чтения в глобальном конфиге view и разрешении обращения к этому _vid в объекте прикрепленным к socket для данного view
    * при проверке создания, проверяются идентификаторы _vid для view в массиве объектов request на их разрешение создания в глобальном конфиге view и разрешении обращения к этому _vid в объекте прикрепленным к socket для данного view
    * при проверке модификации, проверяются идентификаторы _vid для view в массиве объектов request[].properties на их разрешение модификации в глобальном конфиге view и разрешении обращения к этому _vid в объекте прикрепленным к socket для данного view
    * при проверке удаления, проверяются идентификаторы _vid для view в массиве объектов request[].selector на их разрешение удаления в глобальном конфиге view и разрешении обращения к этому _vid в объекте прикрепленным к socket для данного view
* в случае успешной проверки передаем необходимые параметры во view, и результаты работы view возвращаем в callback

Параметры:
* type - строка тип запроса (read, create, modify, delete)
* sender - объект с информацией о пользователе от которого пришел запрос c указанием откуда пришел запрос
    * login - строка, логин пользователя
    * role - строка, роль пользователя
    * userId - строка, идентификатор пользователя
    * [place] - cтрока, название view от которого пришел запрос
* request - объект или массив объектов, которые содержат запросы пользователя
* viewName - строка, имя view
* socket - объект сокета (временно для нахождения прав необходимо прикрепить login и роль)
* callback (err, reply, count) — функция обратного вызова
     * err — ошибка работы с Redis от node_redis, отсутствие прав, ошибки от view
     * reply —

## findErrorLogging( options, sender, callback )
Поиск залогированных ошибок (временно: только ошибки связанные с целостностью) в redis.

Параметры:
* options - параметры поиска ошибок
    * [all] - логический, сигнализирует о возвращении всех сохраненных в redis ошибок
    * [min] - числовой, задает нижнию границу временного интервала выбора ошибок в милисекундах
    * [max] - числовой, задает верхнию границу временного интервала выбора ошибок в милисекундах
* sender - объект с информацией о пользователе от которого пришел запрос c указанием откуда пришел запрос
    * login - строка, логин пользователя
    * role - строка, роль пользователя
    * userId - строка, идентификатор пользователя
    * [place] - cтрока, название view от которого пришел запрос
* callback (err, reply) - функция обратного вызова
    * err - ошибка работы с Redis от node_redis
    * reply - массив объектов в описанием зафиксированных ошибок

Описание формата залогированной ошибки:
* type - строка, тип ошибки
* variant - числовой, вариент ошибки (уточняет ошибку в зависимости от её типа и места возникновения)
* place - строка, название функции связанной с возникшей ошибкой (место возникновения)
* time - числовой, дата и время возниуновения ошибки в милисикундах
* [sender] - объект с информацией о пользователе от которого пришел запрос c указанием откуда пришел запрос
    * login - строка, логин пользователя
    * [role] - строка, роль пользователя
    * [userId] - строка, идентификатор пользователя
    * [place] - cтрока, название view от которого пришел запрос
* [arguments] - объект хранящий в себе основные аргументы функции для повторного её вызова (проверка актуальности ошибки)
    * [query] - объект запрос (от админки)
    * [viewName] - строка, название view
    * [list_vidsFromSocket] - массив, разрешенных идентификаторов view прикрепленных к socket
    * [listAllowedOf_vid] - массив, разрешенных идентификаторов view переданных во View
    * [type] - строка, тип запроса на данные
    * [request] - объект запрос на данные для view
    * [socketViews] - объект view прикрепленный к socket (сохранена только часть объекта socket)
    * [options] - объект с описанием параметров поиска залогированной ошибки
    * [role] - строка, роль пользователя
    * [user] - строка, логин пользователя
    * [flexoName] - строка, название flexo схемы
    * [objAccess] - объект прав
    * [odjUser] - объект с описание пользователя
    * [_idUser] - строка, идентификатор пользователя
    * [optionsView] - объект с опциями при запросе данных у View
* descriptione - объект с описанием ошибки
    * [title] - строка, краткое описание ошибки на английском языке
    * text - строка, описание ошибки на русском языке
    * [vidsFromView] - массив, идентификаторов возвращенных от view
    * [allowedOf_vid] - строка, название идентификатора, который стал причиной ошибки
    * [globalFlexo] - объект с описанием одной flexo полученное из глобального объекта
    * [objAccessRole] - объект прав по роли
    * [objAccessUser] - объект прав по пользователю
    * [globalView] - объект с описание одной view из глобальной переменной
    * [_idUser] - строка, идентификатор пользователя

Пример объекта описывающей залогированную ошибку
'''
   var obj = {
        type:'loss_integrity', //Тип ошибки: нарушение целостности
        variant: 1, //Вариант уточняет, что есть разрешение в правах на view для идентификатора _vid которой нет в глобальной переменной описывающей view
        place: 'formingFlexoAndView', //место возникновения, функция формирования списка разрешенных идентификаторов для view
        time: new Date().getTime(), //время возникновения
        descriptione: { //Описание ошибки
            viewName: viewName, //название view
            user: user, //логин пользователя
            role: role  //роль пользователя
        }
   }
'''