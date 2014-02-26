/*
   jTable localization file for 'Russian' language.
   Author: Stanislav Reznikov
*/
(function ($) {

  $.extend( true, $.hik.jtable.prototype.options, {
    messages: {
      noData: 'Данные отсутствуют',
      yes: 'да',
      no: 'нет',
      errors: {
        serverCommunication: 'Ошибка связи с сервером:<br/>{0}',
        cannotLoadOptions: 'Ошибка загрузки вариантов для поля {1}:<br/>{0}',
        error: 'Ошибка'
      },
      operations: {
        confirm: 'Вы уверены?',
        saving: 'Сохранение данных',
        loading: 'Загрузка данных',
        reload: 'Обновить',
        save: 'Сохранить',
        reset: 'Сбросить',
        cancel: 'Отмена',
        close: 'Закрыть'
      },
      create: {
        add: 'Создать',
        copy: 'Скопировать',
        progress: 'Добавление записи',
        failure: 'Не удалось создать запись'
      },
      edit: {
        text: 'Изменить',
        progress: 'Обновление записи',
        progressMultiple: 'Обновление записи {0} из {1}',
        failure: 'Не удалось обновить запись',
        failureMultiple: 'Не удалось обновить запись {0} из {1}'
      },
      remove: {
        text: 'Удалить',
        progress: 'Удаление записи',
        progressMultiple: 'Удаление записи {0} из {1}',
        confirmation: 'Подтведите удаление',
        failure: 'Не удалось удалить запись',
        failureMultiple: 'Не удалось удалить запись {0} из {1}'
      },
      paging: {
        info: 'Записи с {0} по {1} из {2}',
        page: 'Страница',
        size: 'Строк на странице'
      },
      filter: {
        show: 'Показать/скрыть фильтры',
        apply: 'Применить фильтры',
        disable: 'Отменить фильтры',
        clear: 'Очистить фильтры',
        range: {
          from: 'от',
          to: 'до'
        }
      },
      datepicker: {
        text: 'Выбрать дату'
      }
    },
    datepicker: {
      language: 'ru'
    }
  } );

})(jQuery);
