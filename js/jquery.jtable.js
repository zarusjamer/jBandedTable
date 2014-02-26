/* 
jBandedTable 0.1
Copyright (C) 2013-2014 by Zaripov "ZarusJamer" Ruslan
IDC about licensing even if this work will help you to create your own facebook 
or google with twitter and pussies.

jTable 2.3.1
http://www.jtable.org

---------------------------------------------------------------------------

Copyright (C) 2011-2013 by Halil İbrahim Kalkan (http://www.halilibrahimkalkan.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

/************************************************************************
* CORE jTable module                                                    *
*************************************************************************/
( function ($) {

  if ( typeof String.prototype.format !== 'function' ) {
    String.prototype.format = function() {
      var args = arguments;
      return this.replace( /\{\{|\}\}|\{(\d+)\}/g, function( m, n ) {
        if ( m == "{{" ) {
          return "{";
        }
        if ( m == "}}" ) {
          return "}";
        }
        return args[n] !== undefined ? args[n] : m;   
      } );
    };
  }
  if ( typeof Array.prototype.indexOfObject !== 'function' ) {
    Array.prototype.indexOfObject = function( compare ) {
      if ( typeof compare != 'function' ) {
        return -1;
      }
      for ( var i = 0, max = this.length; i < max; i++ ) {
        if ( compare( this[i] ) ) {
          return i;
        }
      }
      return -1;
    };
  }

  var unloadingPage = false;
    
  $( window )
    .on( 'beforeunload', function() {
      unloadingPage = true;
    } )
    .on( 'unload', function() {
      unloadingPage = false;
    } );

  $.widget( "hik.jtable", {

    /************************************************************************
    * DEFAULT OPTIONS / EVENTS                                              *
    *************************************************************************/
    options: {
      //Options
      defaultDateFormat: 'yyyy-mm-dd',
      defaultDateInputFormat: '9999-99-99',
      showTitle: true,
      showCloseButton: false,
      saveUserPreferences: false,
      jqueryuiTheme: false,
      
      animations: {
        enabled: true,
        loading: {
          delay: 50
        },
        dialogs: {
          show: 'fade',
          hide: 'fade',
          delay: 'slow'
        },
        rows: {
          show: 'easeInCubic',
          hide: 'easeOutCubic',
          created: 'jtable-row-created',
          deleting: 'jtable-row-deleting',
          updated: 'jtable-row-updated',
          delay: 3000
        }
      },
      
      fields: {},

      // editing
      ajaxSettings: {
        type: 'POST',
        dataType: 'json'
      },
      
      reload: true,
      edit: false,
      remove: false,
      create: false,

      actions: {},

      toolbar: {
        hoverAnimation: true,
        hoverAnimationDuration: 60,
        hoverAnimationEasing: undefined,
        items: []
      },
      //Events
      closeRequested: function( event, data ) { },
      formCreated: function( event, data ) { },
      formSubmitting: function( event, data ) { },
      formClosed: function( event, data ) { },
      loadingRecords: function( event, data ) { },
      recordsLoaded: function( event, data ) { },
      rowInserted: function( event, data ) { },
      rowsRemoved: function( event, data ) { },
      
      buttons: {
        header: $.noop,
        row: $.noop
      },
      
      icons: {
        operations: {
          reload: 'ui-icon-refresh',
          cancel: 'ui-icon-cancel',
          close: 'ui-icon-close',
          reset: 'ui-icon-trash'
        }
      },

      //Localization
      messages: {
        noData: 'No data available',
        yes: 'yes',
        no: 'no',
        errors: {
          communication: 'Communication with host failed.<br/>{0}',
         loadingOptions: 'Loading options for field {1} failed.<br/>{0}',
          loadingRecords: 'Loading records failed.<br/>{0}',
          error: 'Error'
        },
        operations: {
          confirm: 'Are you sure?',
          saving: 'Saving data',
          loading: 'Loading data',
          reload: 'Reload',
          save: 'Save',
          reset: 'Reset',
          cancel: 'Cancel',
          close: 'Close'
        }
      }
    },

    /************************************************************************
    * PRIVATE FIELDS                                                        *
    *************************************************************************/

    _$mainContainer: null, //Reference to the main container of all elements that are created by this plug-in (jQuery object)

    _$titleDiv: null, //Reference to the title div (jQuery object)
    _$toolbarDiv: null, //Reference to the toolbar div (jQuery object)

    _$table: null, //Reference to the main <table> (jQuery object)
    _$tableBody: null, //Reference to <body> in the table (jQuery object)
    _$tableRows: null, //Array of all <tr> in the table (except "no data" row) (jQuery object array)

    _busy: {
      timer: null,
      $panel: null,
      $message: null,
    },

    //_busy.$panel: null, //Reference to the div that is used to block UI while busy (jQuery object)
    //_busy.$message: null, //Reference to the div that is used to show some message when UI is blocked (jQuery object)
    _$errorDialogDiv: null, //Reference to the error dialog div (jQuery object)

    _columnList: null, //Name of all data columns in the table (select column and command columns are not included) (string array)
    _fieldList: null, //Name of all fields of a record (defined in fields option) (string array)
    _keyField: null, //Name of the key field of a record (that is defined as 'key: true' in the fields option) (string)

    _firstDataColumnOffset: 0, //Start index of first record field in table columns (some columns can be placed before first data column, such as select checkbox column) (integer)
    _lastPostData: null, //Last posted data on load method (object)

    _cache: null, //General purpose cache dictionary (object)
    _colspan: 0,

    /************************************************************************
    * CONSTRUCTOR AND INITIALIZATION METHODS                                *
    *************************************************************************/

    /* Contructor.
    *************************************************************************/
    _create: function() {
      this._createMainContainer();

      this._createErrorDialogDiv();

      this._createTableTitle();
      this._createToolBar();

      //Initialization
      this._normalizeFieldsOptions();
      this._initializeFields();
      this._createFieldAndColumnList();

      //Creating DOM elements
      this._createTable();
      this._addNoDataRow();

      this._cookieKeyPrefix = this._generateCookieKeyPrefix();            
    },

    _serializeObjects: function( objects, excludeEmpty ) {
      var data = objects.serializeArray();
      var result = {};
      for ( var i = 0, max = data.length; i < max; i++ ) {
        var name = data[i].name, value = data[i].value;
        if ( excludeEmpty && ( value == null || typeof value == 'undefined' || value == '' ) ) {
          continue;
        }
        result[name] = value;
      }
      return result;
    },
    
    /* Normalizes some options for all fields (sets default values).
    *************************************************************************/
    _normalizeFieldsOptions: function() {
      var self = this;
      $.each( self.options.fields, function( fieldName, props ) {
        self._normalizeFieldOptions( fieldName, props );
      } );
    },

    /* Normalizes some options for a field (sets default values).
    *************************************************************************/
    _normalizeFieldOptions: function( fieldName, props ) {
      if ( props.listClass == undefined ) {
        props.listClass = '';
      }
      if ( props.inputClass == undefined ) {
        props.inputClass = '';
      }

      //Convert dependsOn to array if it's a comma seperated lists
      if ( props.dependsOn && $.type( props.dependsOn ) === 'string' ) {
        var dependsOnArray = props.dependsOn.split( ',' );
        props.dependsOn = [];
        for (var i = 0; i < dependsOnArray.length; i++) {
          props.dependsOn.push( $.trim( dependsOnArray[i] ) );
        }
      }
    },

    /* Intializes some private variables.
    *************************************************************************/
    _initializeFields: function() {
      this._lastPostData = {};
      this._$tableRows = [];
      this._columnList = [];
      this._fieldList = [];
      this._cache = [];
      this._keyField = [];
    },

    /* Fills _fieldList, _columnList arrays and sets _keyField variable.
    *************************************************************************/
    _createFieldAndColumnList: function() {
      var self = this;
      $.each( self.options.fields, function( name, props ) {
        //Add field to the field list
        self._fieldList.push( name );
        //Check if this field is the key field
        if ( props.key == true ) {
          self._keyField.push( name );
        }
        //Add field to column list if it is shown in the table
        if ( props.list != false && props.type != 'hidden' ) {
          self._columnList.push( name );
        }
      } );
    },

    /* Creates the main container div.
    *************************************************************************/
    _createMainContainer: function() {
      this._$mainContainer = 
        $( '<div/>' )
          .addClass( 'jtable-main-container' )
          .appendTo( this.element );

      this._jqueryuiThemeAddClass.apply( this, [ this._$mainContainer, 'ui-widget' ] );
    },

    /* Creates title of the table if a title supplied in options.
    *************************************************************************/
    _createTableTitle: function() {
      if ( !this.options.showTitle ) {
        return;
      }
      var $titleDiv = 
        $( '<div/>' )
          .addClass( 'jtable-title' )
          .appendTo( this._$mainContainer );
      this._jqueryuiThemeAddClass.call( this, $titleDiv, 'ui-widget-header' );
      this._$titleDiv = $titleDiv;
      this._changeTableTitle.call( this );
    },
    
    _changeTableTitle: function() {
      if ( !this.options.showTitle || !this._$titleDiv ) {
        return;
      }
      var $title = this._$titleDiv.find( '.jtable-title-text' );
      if ( $title.length == 0 ) {
        $title = 
          $( '<div/>' )
            .addClass( 'jtable-title-text' )
            .appendTo( this._$titleDiv );
      }
      $title.html( this.options.title );
    },

    /* Creates the table.
    *************************************************************************/
    _createTable: function() {
      this._$table = $( '<table/>' )
        .addClass( 'jtable' )
        .appendTo( this._$mainContainer );

      if ( this.options.tableId ) {
        this._$table.attr( 'id', this.options.tableId );
      }

      this._jqueryuiThemeAddClass.call( this, this._$table, 'ui-widget-content' );
      this._createTableHead.call( this );
      this._createTableBody.call( this );
    },

    /* Creates header (all column headers) of the table.
    *************************************************************************/
    _createTableHead: function() {
      var $thead = 
        $( '<thead/>' );

      var $row = null;
      var $rowset = $();
      for ( var i = 0; i < this._columnList.length; i++ ) {
        var 
          name = this._columnList[i],
          options = this.options.fields[name];
        var $cell = this._createHeaderCell.call( this, name, options );
        if ( this.options.banded ) {
          var row = 1; 
          if ( options.rows && options.rows.start > 0 ) {
            row = options.rows.start;
          }
          $row = $rowset.eq( row - 1 );
        }
        if ( !$row || $row.length == 0 ) {
          $row = $( '<tr/>' ).appendTo( $thead );
          $rowset = $( $rowset ).add( $row );
        }
        var $th = 
          $( '<th/>' )
            .addClass( 'jtable-column-header' )
            .addClass( options.listClass )
            .append( $cell )
            .appendTo( $row );
        this._jqueryuiThemeAddClass.call( this, $th, 'ui-state-default' );
        if ( options.width != undefined ) {
          if ( isNaN( options.width ) ) {
            $th.css( 'width', options.width );
          } else {
            $th.css( { 
              'width': '' + options.width + 'px',
              'min-width': '' + ( options.width - 10 ) + 'px',
              'max-width': '' + ( options.width + 10 ) + 'px'
            } );
          }
        }
        if ( this.options.banded ) {
          if ( options.columns && options.columns.count > 0 ) {
            $th.attr( 'colspan', options.columns.count );
          }
          if ( options.rows && options.rows.count > 0 ) {
            $th.attr( 'rowspan', options.rows.count );
          }
        }
        
      }
      
      this._createHeaderCommands.call( this, $rowset );
      
      columnsPerRow = 0;
      $rowset.eq(0).find( 'th' ).each( function() {
        colspan = parseInt( $( this ).attr( 'colspan' ) );
        if ( colspan > 0 ) {
          columnsPerRow += colspan;
        } else {
          columnsPerRow += 1;
        }
      } );
      this._colspan = columnsPerRow;
      this._rowspan = $rowset.length;
      
      $thead
        .appendTo( this._$table );

      return $thead;
    },

    _createHeaderCommands: function( $rowset ) {
      var $command = null;
      
      if ( this.options.reload ) {
        if ( !$command || $command.length == 0 ) {
          $command = this._createEmptyCommandHeader.call( this, $rowset );
        }
        var $button = 
          $( '<span>' )
            .attr( 'title', this.options.messages.operations.reload )
            .html( this.options.messages.operations.reload )
            .button( {
              text: false,
              icons: {
                primary: this.options.icons.operations.reload
              }
            } )
            .on( 'click', function( event ) {
              if ( event.button != 0 ) {
                return;
              }
              this._reloadTable.call( this );
            }.bind( this ) );
        $command.append( $button );
      }
      if ( this.options.showCloseButton ) {
        if ( !$command || $command.length == 0 ) {
          $command = this._createEmptyCommandHeader.call( this, $rowset );
        }
        var $button = 
          $( '<span>' )
            .attr( 'title', this.options.messages.operations.close )
            .html( this.options.messages.operations.close )
            .button( {
              text: false,
              icons: {
                primary: this.options.icons.operations.close
              }
            } )
            .on( 'click', function( event ) {
              if ( event.button != 0 ) {
                return;
              }
              this._onCloseRequested.call( this );
            }.bind( this ) );
        $command.append( $button );
      }
      if ( this.options.buttons.header || this.options.buttons.row ) {
        if ( !$command || $command.length == 0 ) {
          $command = this._createEmptyCommandHeader.call( this, $rowset );
        }
        if ( typeof this.options.buttons.header == 'function' ) {
          $command.append( this.options.buttons.header.call( this ) );
        } else if ( typeof this.options.buttons.header == 'string' ) {
          $command.append( this.options.buttons.header );
        }
      }
      return $command;
    },
    /* Creates a header cell for given field.
    *  Returns th jQuery object.
    *************************************************************************/
    _createHeaderCell: function( name, options ) {
      var $cell = 
        $( '<div/>' )
          .addClass( 'jtable-column-header-container' );
      $( '<span/>' )
        .addClass( 'jtable-column-header-text' )
        .html( options.title )
        .appendTo( $cell );
      return $cell;
    },

    /* Creates an empty header cell that can be used as command column headers.
    *************************************************************************/
    _createEmptyCommandHeader: function( $rowset ) {
      var $cell = $rowset.find( '.jtable-command-column-header' );
      if ( $cell.length == 0 ) {
        ++this._firstDataColumnOffset;
        $cell = $( '<th/>' ).addClass( 'jtable-command-column-header' );
        if ( $rowset.length == 0 ) {
          $rowset = ( $rowset ).add( $( '<tr/>' ) );
        } else if ( $rowset.length > 1 ) {
          $cell.attr( 'rowspan', $rowset.length );
        }
        this._jqueryuiThemeAddClass.call( this, $cell, 'ui-state-default' );
        $rowset.eq( 0 ).prepend( $cell );
      }
      return $cell;
    },

    /* Creates an empty column cell that can be used as command column.
    *************************************************************************/
    _createEmptyCommandColumn: function( $rowset ) {
      var $cell = $rowset.find( '.jtable-command-column-header' );
      if ( $cell.length == 0 ) {
        $cell = $( '<td/>' ).addClass( 'jtable-command-column-header' );
        if ( $rowset.length > 1 ) {
          $cell.attr( 'rowspan', $rowset.length );
        } 
        $rowset.eq( 0 ).prepend( $cell );
      }
      return $cell;
    },

    /* Creates tbody tag and adds to the table.
    *************************************************************************/
    _createTableBody: function() {
      this._$tableBody = $( '<tbody/>' ).appendTo( this._$table );
    },

    /* Creates and prepares error dialog div.
    *************************************************************************/
    _createErrorDialogDiv: function() {
      this._$errorDialogDiv = $( '<div/>' ).appendTo( this._$mainContainer );
      this._$errorDialogDiv.dialog( {
        autoOpen: false,
        show: this.options.animations.dialogs.show,
        hide: this.options.animations.dialogs.hide,
        modal: true,
        title: this.options.messages.errors.error,
        buttons: [ {
          text: this.options.messages.operations.close,
          click: function() {
            this._$errorDialogDiv.dialog( 'close' );
          }.bind( this )
        }]
      } );
    },

    /************************************************************************
    * PUBLIC METHODS                                                        *
    *************************************************************************/

    /* Loads data using AJAX call, clears table and fills with new data.
    *************************************************************************/
    load: function( postData, completeCallback ) {
      this._lastPostData = postData;
      this._reloadTable.call( this, completeCallback );
    },

    /* Refreshes (re-loads) table data with last postData.
    *************************************************************************/
    reload: function( completeCallback ) {
      this._reloadTable.call( this, completeCallback );
    },
        
    showBusy: function( message, delay ) {
      this._showBusy.call( this, message, delay );
    },

    hideBusy: function() {
      this._hideBusy.call( this );
    },
    
    _compareKeys: function( key1, key2 ) {
      for ( var name in key1 ) {
        if ( key1[name] != key2[name] ) {
          return false;
        }
      }
      return true;
    },
    
    getIndexOfRow: function( $rowset, rows ) {
      var index = rows.indexOf( $rowset );
      if ( index > -1 ) {
        return index;
      }
      var key1 = this._getKeyValueOfRecord.call( this, $rowset.data( 'record' ) );
      for ( var i = 0, max = rows.length; i < max; i++ ) {
        var key2 = this._getKeyValueOfRecord.call( this, rows[i].data( 'record' ) );
        if ( this._compareKeys( key1, key2 ) ) {
          return i;
        }
      }
      return -1;
    },

    getIndexByKey: function( record ) {
      var key1 = this._getKeyValueOfRecord.call( this, record );
      for ( var i = 0, max = this._$tableRows.length; i < max; i++ ) {
        var key2 = this._getKeyValueOfRecord.call( this, this._$tableRows[i].data( 'record' ) );
        if ( this._compareKeys( key1, key2 ) ) {
          return i;
        }
      }
      return -1;
    },

    getRowByKey: function( record ) {
      var key1 = this._getKeyValueOfRecord.call( this, record );
      for ( var i = 0, max = this._$tableRows.length; i < max; i++ ) {
        var key2 = this._getKeyValueOfRecord.call( this, this._$tableRows[i].data( 'record' ) );
        if ( this._compareKeys( key1, key2 ) ) {
          return this._$tableRows[i];
        }
      }
    },
        
    getRows: function() {
      return this._$tableRows;
    },

    /* Completely removes the table from it's container.
    *************************************************************************/
    destroy: function() {
      this.element.empty();
      $.Widget.prototype.destroy.call( this );
    },
        
    /* Clears table of rows on client side.
     *************************************************************************/
    clear: function() {
      this._removeAllRows.apply( this );
    },
        
    set: function( option, value ) {
      if ( typeof option == 'undefined' ) {
        return;
      }
      this.options[option] = value;
    },
        
    get: function( option ) {
      if ( typeof option == 'undefined' ) {
        return;
      }
      return this.options[option];
    },
        
    setTitle: function( title ) {
      this.options.title = title;
      this._changeTableTitle.apply( this );
    },

    /************************************************************************
    * PRIVATE METHODS                                                       *
    *************************************************************************/

    /* Used to change options dynamically after initialization.
    *************************************************************************/
    _setOption: function(key, value) {

    },

    /* LOADING RECORDS  *****************************************************/

    /* Performs an AJAX call to reload data of the table.
    *************************************************************************/
    _reloadTable: function( completeCallback ) {
      //Disable table since it's busy
      this._showBusy.call( this, this.options.messages.operations.loading, this.options.animations.loading.delay );

      this._onLoadingRecords.call( this );

      //Generate ajax settings to load records (include page info
      var ajaxSettings = this._createRecordLoadUrl.call( this );
      $.extend( true, ajaxSettings, { data: this._lastPostData } );
        
      //Load data from server
      this._ajax.call( this, ajaxSettings )
        .done( function( results, status, xhr ) {
          if ( results && results.Result ) {
            if ( results.Records ) {
              this._removeAllRows.call( this, 'reloading' );
              this._addRecordsToTable.call( this, results.Records );
              this._onRecordsLoaded.call( this, results );
              if ( typeof completeCallback == 'function' ) {
                completeCallback();
              }
              return;
            }
          }
          var message = this.options.messages.errors.loadingRecords.format( results.Message );
          this._showError.call( this, message );
        }.bind( this ) )
        .always( function() {
          this._hideBusy.call( this );
        }.bind( this ) );
    },
    
    _createAjaxSettings: function() {
      var ajaxSettings = {};
      for ( var i = 0, max = arguments.length; i < max; i++ ) {
        var action = arguments[i];
        if ( typeof action == 'string' ) {
          ajaxSettings.url = action;
        } else if ( typeof action == 'function' ) {
          $.extend( true, ajaxSettings, action.call( this ) );
        } else if ( action ) {
          $.extend( true, ajaxSettings, action );
        }
      }
      return ajaxSettings;
    },

    /* Creates URL to load records.
    *************************************************************************/
    _createRecordLoadUrl: function() {
      return this._createAjaxSettings.call( this, this.options.actions.list );
    },

    /* TABLE MANIPULATION METHODS *******************************************/

    /* Creates a row from given record
    *************************************************************************/
    _createRowFromRecord: function( record ) {
      var $row = null;
      var $rowset = $();
      for ( var i = 0; i < this._columnList.length; i++ ) {
        var 
          name = this._columnList[i],
          options = this.options.fields[name];
        var $cell = this._createRowCell.call( this, name, options, record );
        var row = 1; 
        if ( this.options.banded ) {
          if ( options.rows && options.rows.start > 0 ) {
            row = options.rows.start;
          }
          $row = $rowset.eq( row - 1);
        }
        if ( !$row || $row.length == 0 ) {
          $row = 
            $( '<tr/>' )
              .addClass( 'jtable-data-row' );
          $rowset = $( $rowset ).add( $row );
        }
        var $td = 
          $( '<td/>' )
            .append( $cell )
            .appendTo( $row );
        if ( this.options.banded ) {
          if ( options.columns && options.columns.count > 0 ) {
            $td.attr( 'colspan', options.columns.count );
          }
          if ( options.rows && options.rows.count > 0 ) {
            $td.attr( 'rowspan', options.rows.count );
          }
        }
        
      }

      $rowset.data( 'record', record );

      var $command = null;
      if ( this.options.reload || this.options.buttons.header || this.options.showCloseButton ) {
        $command = this._createEmptyCommandColumn.call( this, $rowset );
      }
      if ( this.options.buttons.row ) {
        if ( !$command ) {
          $command = this._createEmptyCommandColumn.call( this, $rowset, record );
        }
        if ( typeof this.options.buttons.row == 'function' ) {
          $command.append( this.options.buttons.row.call( this, $rowset, record ) );
        } else if ( typeof this.options.buttons.row == 'string' ) {
          $command.append( this.options.buttons.row );
        }
      }

      return $rowset;
    },

    /* Create a cell for given field.
    *************************************************************************/
    _createRowCell: function( name, options, record ) {
      var $div = 
        $( '<div/>' )
          .append( this._getDisplayTextForValue.call( this, name, options, record ) )
          .addClass( 'jtable-column-value' );
      return $div;
    },

    /* Adds a list of records to the table.
    *************************************************************************/
    _addRecordsToTable: function( records, options ) {
      for ( var i = 0, max = records.length; i < max; i++ ) {
        this._addRow.call( this, this._createRowFromRecord.call( this, records[i], options ) );
      };
      this._refreshRowStyles.call( this );
    },

    /* Adds a single row to the table.
    *************************************************************************/
    _addRow: function( $rowset, options ) {
      //Set defaults
      options = $.extend( true, {}, {
        index: this._$tableRows.length,
        isNewRow: false
      }, options );
      
      
      //Remove 'no data' row if this is first row
      if ( this._$tableRows.length <= 0 ) {
        this._removeNoDataRow.call( this );
      }

      //Add new row to the table according to it's index
      options.index = this._normalizeNumber.call( this, options.index, 0, this._$tableRows.length, this._$tableRows.length );
      if ( options.index == this._$tableRows.length ) {
        //add as last row
        this._$tableBody.append( $rowset );
        this._$tableRows.push( $rowset );
      } else if ( options.index == 0 ) {
        //add as first row
        this._$tableBody.prepend( $rowset );
        this._$tableRows.unshift( $rowset );
      } else {
        //insert to specified index
        this._$tableRows[options.index - 1].after( $rowset );
        this._$tableRows.splice( options.index, 0, $rowset );
      }
      
      this._refreshRowStyles.call( this );

      this._onRowInserted.call( this, $rowset, options.isNewRow );

      //Show animation if needed
      if ( !options.isNewRow ) {
        return;
      }
      if ( !this.options.animations.enabled ) {
        return;
      }
      var className = this.options.animations.rows.created;
      if ( this.options.jqueryuiTheme ) {
        className = className + ' ui-state-highlight';
      }
      $rowset
        .stop( true, true )
        .addClass( className )
        .promise()
        .done( function() {
          $rowset.removeClass( className, this.options.animations.rows.delay, this.options.animations.rows.hide );
        }.bind( this ) );
    },

    /* Removes a row (rowset if banded) from table.
    *************************************************************************/
    _removeRowsetFromTable: function( $rowset, reason ) {
      if ( !$rowset || $rowset.length == 0 ) {
        return;
      }
      var index = this.getIndexOfRow( $rowset, this._$tableRows );
      if ( index > -1 ) {
        this._$tableRows.splice( index, 1 );
        this._onRowsRemoved.call( this, $rowset, reason );
        if ( this._$tableRows.length == 0) {
          this._addNoDataRow.call( this );
        }
      }
      $rowset.remove();
      this._refreshRowStyles.call( this );
    },

    /* Removes all rows in the table and adds 'no data' row.
    *************************************************************************/
    _removeAllRows: function( reason ) {
      //If no rows does exists, do nothing
      if ( this._$tableRows.length <= 0 ) {
        return;
      }
      //Select all rows (to pass it on raising _onRowsRemoved event)
      var $rows = this._$tableBody.find( 'tr.jtable-data-row' );

      //Remove all rows from DOM and the _$tableRows array
      this._$tableBody.empty();
      this._$tableRows = [];

      this._onRowsRemoved.call( this, $rows, reason );
      this._addNoDataRow.call( this );
      this._refreshRowStyles.call( this );
    },

    /* Adds "no data available" row to the table.
    *************************************************************************/
    _addNoDataRow: function() {
      if ( this._$tableBody.find( '>tr.jtable-no-data-row' ).length > 0 ) {
        return;
      }
      var
        totalColumnCount = this._$table.find( 'thead th' ).length, 
        $row = $('<tr/>')
          .addClass( 'jtable-no-data-row' )
          .appendTo( this._$tableBody );
      $('<td/>' )
        .attr('colspan', totalColumnCount )
        .html( this.options.messages.noData )
        .appendTo( $row );
    },

    /* Removes "no data available" row from the table.
    *************************************************************************/
    _removeNoDataRow: function() {
      this._$tableBody.find( '.jtable-no-data-row' ).remove();
    },

    /* Refreshes styles of all rows in the table
    *************************************************************************/
    _refreshRowStyles: function() {
      for ( var i = 0, max = this._$tableRows.length; i < max; i++ ) {
        this._$tableRows[i].toggleClass( 'jtable-row-even', ( i % 2 == 0 ) );
      }
    },

        /* RENDERING FIELD VALUES ***********************************************/

    /* Gets text for a field of a record according to it's type.
    *************************************************************************/
    _getDisplayTextForValue: function( name, options, record ) {
      var
        value = record[name],
        text;

      if ( options.type == 'date' ) {
        text = this._getDisplayTextForDateRecordField.call( this, options, value );
      } else if ( options.type == 'checkbox' ) {
        text = this._getCheckBoxTextForFieldByValue.call( this, name, value );
      } else if ( options.options ) { //combobox or radio button list since there are options.
        var values = this._getOptionsForField.call( this, name, {
          record: record,
          value: value,
          source: 'list',
          dependencies: this._createDependenciesUsingRecord.call( this, record, options.dependsOn )
        } );
        text = this._findOptionByValue.call( this, values, value ).DisplayText || value;
      } else { //other types
        text = value;
      }
      
      //if this is a custom field, call display function
      if ( typeof options.display == 'function' ) {
        text = options.display.call( this, { record: record }, value, text );
      }
      return text;
    },

    /* Creates and returns an object that's properties are Dependcy values of a record.
    *************************************************************************/
    _createDependenciesUsingRecord: function( record, dependsOn ) {
      if ( !dependsOn ) {
        return {};
      }
      var dependencies = {};
      for ( var i = 0, max = dependsOn.length; i < max; i++) {
        dependencies[dependsOn[i]] = record[dependsOn[i]];
      }
      return dependencies;
    },

    /* Finds an option object by given value.
    *************************************************************************/
    _findOptionByValue: function( options, value ) {
      if ( !options ) {
        return {};
      }
      for ( var i = 0, max = options.length; i < max; i++ ) {
        if ( options[i].Value === value ) {
          return options[i];
        }
      }
      return {}; //no option found
    },

    /* Gets text for a date field.
    *************************************************************************/
    _getDisplayTextForDateRecordField: function( options, fieldValue ) {
      if ( !fieldValue ) {
        return '';
      }
      var displayFormat = options.displayFormat || this.options.defaultDateFormat;
      var date = this._parseDate.call( this, fieldValue );
      return $.datepicker.formatDate( displayFormat, date );
    },

    /* Gets options for a field according to user preferences.
    *************************************************************************/
    _getOptionsForField: function( name, params ) {
      var 
        options = this.options.fields[name],
        cacheKey = 'options_' + name,
        valuesSource = options.options,
        values = null;
      
      for ( var obj in params.dependencies ) {
        cacheKey += '_' + params.dependencies[obj];
      }

      if ( params && ( params.source == 'edit' || params.source == 'create' ) ) {
        cacheKey += '_update';
      }

      if ( params && !params._cacheCleared && this._cache[cacheKey]  ) {
        values = this._cache[cacheKey];
      } else { 
        if ( typeof valuesSource == 'function' ) {
          valuesSource = valuesSource.call( this, params );
        }
        if ( $.isArray( valuesSource ) ) { 
          //It is an array of options
          values = valuesSource;
        } else if ( params.value != undefined ) {
          var optionForValue = this._findOptionByValue( this._cache[cacheKey], params.value );
          if ( optionForValue.DisplayText == undefined ) {
            //this value is not in cached options...
            values = this._downloadOptions.call( this, name, valuesSource );
          }
        } else if ( valuesSource ) {
          values = this._downloadOptions.call( this, name, valuesSource );
        }
        if ( !values ) {
          values = [];
        }
        if ( $.isArray( values ) ) { 
          values = this._buildOptionsFromArray.call( this, values );
        } else { 
          values = this._buildOptionsArrayFromObject.call( this, values );
        }
        this._sortFieldOptions.call( this, values, options.optionsSorting );
        this._cache[cacheKey] = values;
      }
      return values;
    },

    /* Download options for a field from server.
    *************************************************************************/
    _downloadOptions: function( name, action ) {
      this._showBusy.call( this, this.options.messages.operations.loading );
      var opts = this._createAjaxSettings.call( this, action );
      opts.async = false;
      var options = [];
      this._ajax.call( this, opts )
        .done( function( results, status, xhr ) {
          if ( results && results.Result ) {
            if ( results.Options ) {
              options = results.Options;
              return;
            }
          }
          var message = this.options.messages.errors.loadingOptions.format( results.Message, name );
          this._showError.call( this, message );
        }.bind( this ) )
        .always( function() {
          this._hideBusy.call( this );
        }.bind( this ) );
      return options;
    },

    /* Sorts given options according to sorting parameter.
    *  sorting can be: 'value', 'value-desc', 'text' or 'text-desc'.
    *************************************************************************/
        _sortFieldOptions: function(options, sorting) {

          if ((!options) || (!options.length) || (!sorting)) {
            return;
          }

            //Determine using value of text
            var dataSelector;
            if (sorting.indexOf('value') == 0) {
                dataSelector = function(option) {
                    return option.Value;
                };
            } else { //assume as text
                dataSelector = function(option) {
                    return option.DisplayText;
                };
            }

            var compareFunc;
            if ($.type(dataSelector(options[0])) == 'string') {
                compareFunc = function(option1, option2) {
                    return dataSelector(option1).localeCompare(dataSelector(option2));
                };
            } else { //asuume as numeric
                compareFunc = function(option1, option2) {
                    return dataSelector(option1) - dataSelector(option2);
                };
            }

            if (sorting.indexOf('desc') > 0) {
                options.sort(function(a, b) {
                    return compareFunc(b, a);
                });
            } else { //assume as asc
                options.sort(function(a, b) {
                    return compareFunc(a, b);
                });
            }
        },

        /* Creates an array of options from given object.
        *************************************************************************/
        _buildOptionsArrayFromObject: function( options, isCheckbox ) {
          var list = [];
          if ( !isCheckbox ) {
            list.push( { Value: '', DisplayText: '' } );
          }
          $.each( options, function( propName, propValue ) {
            list.push( {
              Value: propName,
              DisplayText: propValue
            } );
          } );
          return list;
        },

        /* Creates array of options from giving options array.
        *************************************************************************/
        _buildOptionsFromArray: function( optionsArray, isCheckbox ) {
          var list = [];
          if ( !isCheckbox ) {
            list.push( { Value: '', DisplayText: '' } );
          }
          for ( var i = 0, max = optionsArray.length; i < max; i++ ) {
            if ( $.isPlainObject( optionsArray[i] ) ) {
              list.push( optionsArray[i] );
            } else { //assumed as primitive type (int, string...)
              list.push( {
                Value: optionsArray[i],
                DisplayText: optionsArray[i]
              } );
            }
          }
          return list;
        },

        /* Parses given date string to a javascript Date object.
        *  Given string must be formatted one of the samples shown below:
        *  /Date(1320259705710)/
        *  2011-01-01 20:32:42 (YYYY-MM-DD HH:MM:SS)
        *  2011-01-01 (YYYY-MM-DD)
        *************************************************************************/
        _parseDate: function(dateString) {
            if (dateString.indexOf('Date') >= 0) { //Format: /Date(1320259705710)/
                return new Date(
                    parseInt(dateString.substr(6), 10)
                );
            } else if (dateString.length == 10) { //Format: 2011-01-01
                return new Date(
                    parseInt(dateString.substr(0, 4), 10),
                    parseInt(dateString.substr(5, 2), 10) - 1,
                    parseInt(dateString.substr(8, 2), 10)
                );
            } else if (dateString.length == 19) { //Format: 2011-01-01 20:32:42
                return new Date(
                    parseInt(dateString.substr(0, 4), 10),
                    parseInt(dateString.substr(5, 2), 10) - 1,
                    parseInt(dateString.substr(8, 2, 10)),
                    parseInt(dateString.substr(11, 2), 10),
                    parseInt(dateString.substr(14, 2), 10),
                    parseInt(dateString.substr(17, 2), 10)
                );
            } else {
                this._logWarn('Given date is not properly formatted: ' + dateString);
                return 'format error!';
            }
        },

        /* TOOL BAR *************************************************************/

        /* Creates the toolbar.
        *************************************************************************/
        _createToolBar: function() {
            this._$toolbarDiv = $('<div />')
            .addClass('jtable-toolbar')
            .appendTo(this._$titleDiv);

            for (var i = 0; i < this.options.toolbar.items.length; i++) {
                this._addToolBarItem(this.options.toolbar.items[i]);
            }
        },

        /* Adds a new item to the toolbar.
        *************************************************************************/
        _addToolBarItem: function(item) {

            //Check if item is valid
            if ((item == undefined) || (item.text == undefined && item.icon == undefined)) {
                this._logWarn('Can not add tool bar item since it is not valid!');
                this._logWarn(item);
                return null;
            }

            var $toolBarItem = $('<span></span>')
                .addClass('jtable-toolbar-item')
                .appendTo(this._$toolbarDiv);

            this._jqueryuiThemeAddClass.call( this, $toolBarItem, 'ui-widget ui-state-default ui-corner-all', 'ui-state-hover');

            //cssClass property
            if (item.cssClass) {
                $toolBarItem
                    .addClass(item.cssClass);
            }

            //tooltip property
            if (item.tooltip) {
                $toolBarItem
                    .attr('title', item.tooltip);
            }

            //icon property
            if (item.icon) {
                var $icon = $('<span class="jtable-toolbar-item-icon"></span>').appendTo($toolBarItem);
                if (item.icon === true) {
                    //do nothing
                } else if ($.type(item.icon === 'string')) {
                    $icon.css('background', 'url("' + item.icon + '")');
                }
            }

            //text property
            if (item.text) {
                $('<span class=""></span>')
                    .html(item.text)
                    .addClass('jtable-toolbar-item-text').appendTo($toolBarItem);
            }

            //click event
            if ( typeof item.click == 'function' ) {
              $toolBarItem.on( 'click', item.click );
            }

            //set hover animation parameters
            var hoverAnimationDuration = undefined;
            var hoverAnimationEasing = undefined;
            if (this.options.toolbar.hoverAnimation) {
                hoverAnimationDuration = this.options.toolbar.hoverAnimationDuration;
                hoverAnimationEasing = this.options.toolbar.hoverAnimationEasing;
            }

            //change class on hover
            $toolBarItem.hover(function() {
                $toolBarItem.addClass('jtable-toolbar-item-hover', hoverAnimationDuration, hoverAnimationEasing);
            }, function() {
                $toolBarItem.removeClass('jtable-toolbar-item-hover', hoverAnimationDuration, hoverAnimationEasing);
            });

            return $toolBarItem;
        },

    /* ERROR DIALOG *********************************************************/

    /* Shows error message dialog with given message.
    *************************************************************************/
    _showError: function( message ) {
      this._$errorDialogDiv.html( message ).dialog( 'open' );
    },

    /* BUSY PANEL ***********************************************************/

    /* Creates a div to block UI while jTable is busy.
     *************************************************************************/
    _createBusyPanel: function() {
      this._busy.$message = 
        $( '<div/>' )
          .addClass( 'jtable-busy-message' );
      this._busy.$panel = 
        $( '<div/>' )
          .addClass( 'jtable-busy-panel-background' );
      this._$mainContainer
          .prepend( this._busy.$message )
          .prepend( this._busy.$panel );
      this._jqueryuiThemeAddClass.call( this, this._busy.$message, 'ui-widget-header' );
      this._hideBusy.call( this );
    },

    /* Shows busy indicator and blocks table UI.
    * TODO: Make this cofigurable and changable
    *************************************************************************/
    _showBusy: function( message, delay ) {
      if ( this._busy.$panel == null ) {
        this._createBusyPanel.call( this );
      }

      var makeVisible = function() {
        this._busy.timer = null;
        this._busy.$panel
          .removeClass( 'jtable-busy-panel-background-invisible' )
          //.innerWidth( this._$mainContainer.outerWidth() )
          //.innerHeight( this._$mainContainer.outerHeight() )
          .show();
        this._busy.$message
          .html( message )
          .show();
      }.bind( this );

      if ( delay ) {
        if ( this._busy.timer ) {
          return;
        }
        this._busy.timer = setTimeout( makeVisible, delay );
      } else {
        makeVisible();
      }
    },

    /* Hides busy indicator and unblocks table UI.
    *************************************************************************/
    _hideBusy: function() {
      if ( !this._busy.timer ) {
        this._busy.$message
          .hide()
          .html( '' );
        this._busy.$panel
          .hide()
          .addClass( 'jtable-busy-panel-background-invisible' );
      }
    }, 

    /* Returns true if jTable is busy.
    *************************************************************************/
    _isBusy: function() {
      return this._busy.$panel.is( ':visible' );
    },

    /* Adds jQueryUI class to an item.
    *************************************************************************/
    _jqueryuiThemeAddClass: function( $element, className, hoverClassName ) {
      if ( !this.options.jqueryuiTheme ) {
        return;
      }
      $element.addClass( className );
      if ( hoverClassName ) {
        $element.hover( function() {
          $element.addClass( hoverClassName );
        }, function() {
          $element.removeClass(hoverClassName);
        } );
      }
    },

    /* COMMON METHODS *******************************************************/

    /* This method is used to perform AJAX calls in jTable instead of direct
    * usage of jQuery.ajax method.
    *************************************************************************/
    _ajax: function( options ) {
      var 
        opts = $.extend( true, {}, this.options.ajaxSettings, options ),
        $call = $.ajax( opts )
          .fail( function( xhr, status, error ) {
            if ( unloadingPage ) {
              xhr.abort();
            } else {
              this._showError.call( this, this.options.messages.errors.communication.format( error ) );
            }
          }.bind( this ) );
      return $call;
    },

    /* Gets value of key field of a record.
    *************************************************************************/
    _getKeyValueOfRecord: function( record ) {
      if ( !record ) {
        return record;
      }
      if ( this._keyField.length == 0 ) {
        return record;
      }
      var results = {};
      for ( var i = 0; i < this._keyField.length; i++ ) {
        var name = this._keyField[i];
        results[name] = record[name];
      }
      return results;
    },

        /************************************************************************
        * COOKIE                                                                *
        *************************************************************************/

        /* Sets a cookie with given key.
        *************************************************************************/
        _setCookie: function(key, value) {
            key = this._cookieKeyPrefix + key;

            var expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + 30);
            document.cookie = encodeURIComponent(key) + '=' + encodeURIComponent(value) + "; expires=" + expireDate.toUTCString();
        },

        /* Gets a cookie with given key.
        *************************************************************************/
        _getCookie: function(key) {
            key = this._cookieKeyPrefix + key;

            var equalities = document.cookie.split('; ');
            for (var i = 0; i < equalities.length; i++) {
                if (!equalities[i]) {
                    continue;
                }

                var splitted = equalities[i].split('=');
                if (splitted.length != 2) {
                    continue;
                }

                if (decodeURIComponent(splitted[0]) === key) {
                    return decodeURIComponent(splitted[1] || '');
                }
            }

            return null;
        },

        /* Generates a hash key to be prefix for all cookies for this jtable instance.
        *************************************************************************/
        _generateCookieKeyPrefix: function() {
          var strToHash = '';
          if ( this.options.tableId ) {
            strToHash = strToHash + this.options.tableId + '#';
          }

          strToHash = strToHash + this._columnList.join( '$' ) + '#c' + this._$table.find( 'thead th' ).length;
          var hash = 0;
          for ( var i = 0, max = strToHash.length; i < max; i++ ) {
            var ch = strToHash.charCodeAt( i );
            hash = ( ( hash << 5 ) - hash ) + ch;
            hash = hash & hash;
          }
          return 'jtable#' + hash;
        },

      /************************************************************************
      * EVENT RAISING METHODS                                                 *
      *************************************************************************/

      _onLoadingRecords: function() {
        this._trigger.call( this, "loadingRecords", null, {} );
      },

      _onRecordsLoaded: function(data) {
        this._trigger.call( this, "recordsLoaded", null, { records: data.Records, serverResponse: data } );
      },

      _onRowInserted: function($row, isNewRow) {
        this._trigger.call( this, "rowInserted", null, { row: $row, record: $row.data( 'record' ), isNewRow: isNewRow } );
      },

      _onRowsRemoved: function($rows, reason) {
        this._trigger.call( this, "rowsRemoved", null, { rows: $rows, reason: reason } );
      },

      _onCloseRequested: function() {
        this._trigger.call( this, "closeRequested", null, {} );
      }

    } );

}( jQuery ) );


/************************************************************************
* Some UTULITY methods used by jTable                                   *
*************************************************************************/
(function($) {

    $.extend( true, $.hik.jtable.prototype, {

        /* Gets property value of an object recursively.
        *************************************************************************/
        _getPropertyOfObject: function(obj, propName) {
            if (propName.indexOf('.') < 0) {
                return obj[propName];
            } else {
                var preDot = propName.substring(0, propName.indexOf('.'));
                var postDot = propName.substring(propName.indexOf('.') + 1);
                return this._getPropertyOfObject(obj[preDot], postDot);
            }
        },

        /* Sets property value of an object recursively.
        *************************************************************************/
        _setPropertyOfObject: function(obj, propName, value) {
            if (propName.indexOf('.') < 0) {
                obj[propName] = value;
            } else {
                var preDot = propName.substring(0, propName.indexOf('.'));
                var postDot = propName.substring(propName.indexOf('.') + 1);
                this._setPropertyOfObject(obj[preDot], postDot, value);
            }
        },

        /* Inserts a value to an array if it does not exists in the array.
        *************************************************************************/
        _insertToArrayIfDoesNotExists: function( array, value ) {
          if ( $.inArray( value, array ) == -1 ) {
            array.push( value );
          }
        },

        /* Normalizes a number between given bounds or sets to a defaultValue
        *  if it is undefined
        *************************************************************************/
        _normalizeNumber: function( number, min, max, defaultValue ) {
          if ( number == undefined || number == null || isNaN( number ) ) {
            return defaultValue;
          }
          if ( number < min ) {
            return min;
          }
          if ( number > max ) {
            return max;
          }
          return number;
        },

        /* Formats a string just like string.format in c#.
        *  Example:
        *  _formatString('Hello {0}','Halil') = 'Hello Halil'
        *************************************************************************/
        _formatString: function() {
          if ( arguments.length == 0 ) {
            return null;
          }
          var str = arguments[0];
          for ( var i = 1; i < arguments.length; i++ ) {
              var placeHolder = '{' + (i - 1) + '}';
              str = str.replace(placeHolder, arguments[i]);
          }
          return str;
        },

        //Logging methods ////////////////////////////////////////////////////////

        _logDebug: function(text) {
            if (!window.console) {
                return;
            }

            console.log('jTable DEBUG: ' + text);
        },

        _logInfo: function(text) {
            if (!window.console) {
                return;
            }

            console.log('jTable INFO: ' + text);
        },

        _logWarn: function(text) {
            if (!window.console) {
                return;
            }

            console.log('jTable WARNING: ' + text);
        },

        _logError: function(text) {
            if (!window.console) {
                return;
            }

            console.log('jTable ERROR: ' + text);
        }

    });

    /* Fix for array.indexOf method in IE7.
     * This code is taken from http://www.tutorialspoint.com/javascript/array_indexof.htm */
    if ( !Array.prototype.indexOf ) {
      Array.prototype.indexOf = function( elt ) {
        var len = this.length;
        var from = Number( arguments[1] ) || 0;
        from = ( from < 0 ) ? Math.ceil( from ) : Math.floor( from );
        if ( from < 0 ) {
          from += len;
        }
        for (; from < len; from++ ) {
          if ( from in this && this[from] === elt ) {
            return from;
          }
        }
        return -1;
      };
    }

})(jQuery);


/************************************************************************
* FORMS extension for jTable (base for edit/create forms)               *
*************************************************************************/
(function($) {

  $.extend( true, $.hik.jtable.prototype, {

    /************************************************************************
    * PRIVATE METHODS                                                       *
    *************************************************************************/

    /* Creates label for an input element.
    *************************************************************************/
    _createInputLabelForRecordField: function( name ) {
      return $( '<div/>' )
        .addClass( 'jtable-input-label' )
        .html( this.options.fields[name].inputTitle || this.options.fields[name].title );
    },

    /* Creates an input element according to field type.
    *************************************************************************/
    _createInputForRecordField: function( name, formType, form, value, record ) {
      var 
        options = this.options.fields[name];

      //If value if not supplied, use defaultValue of the field
      if ( value == undefined || value == null ) {
        value = options.defaultValue;
      }

      //Use custom function if supplied
      if ( typeof options.input == 'function' ) {
        var $input = $( options.input.call( this, {
          value: value,
          record: record,
          formType: formType,
          form: form
        } ) );
        //Add id attribute if does not exists
        if ( !$input.attr( 'id' ) ) {
          $input.attr( 'id', 'edit-' + name );
        }
        //Wrap input element with div
        return $( '<div/>' )
          .addClass( 'jtable-input jtable-custom-input' )
          .append( $input );
      }

        //Create input according to field type
      switch( options.type ) {
        case 'date':
          return this._createDateInput.call( this, options, name, value );
        case 'datetime':
          return this._createDateInput.call( this, options, name, value );
        case 'textarea':
          return this._createTextArea.call( this, options, name, value );
        case 'password':
          return this._createPasswordInput.call( this, options, name, value );
        case 'checkbox':
          return this._createCheckbox.call( this, options, name, value );
        case 'radiobutton':
          return this._createRadioButtonListForField.call( this, options, name, value, record, formType );
        default:
          if ( options.options ) {
            return this._createDropdownList.call( this, options, name, value, record, formType, form );
          }
          return this._createTextInput.call( this, options, name, value );
      }
    },

    //Creates a hidden input element with given name and value.
    _createHiddenInput: function( name, value ) {
      var $div = $( '<input type="hidden" name="' + name + '"/>' );
      $div.val( value || "" );
      return $div;
    },

    /* Creates a date input for a field.
    *************************************************************************/
    _createDateInput: function( options, name, value ) {
      var $input = $( '<input type="text" name="' + name + '" />' );
      if ( options.inputClass != undefined ) {
        $input.addClass( options.inputClass );
      }
      if ( value != undefined ) {
        $input.val( value );
      }
      
      var $div = 
        $( '<div/>' )
          .addClass( 'jtable-input jtable-date-input' )
          .append( $input );
      
      return $div;
    },

    /* Creates a textarea element for a field.
    *************************************************************************/
    _createTextArea: function( options, name, value ) {
      var $input = $( '<textarea name="' + name + '"/>' );
      if ( options.inputClass != undefined ) {
        $input.addClass( options.inputClass );
      }
      if ( value != undefined ) {
        $input.val( value );
      }
      var $div = 
        $( '<div/>' )
          .addClass( 'jtable-input jtable-textarea-input' )
          .append( $input );
      return $div;
    },

    /* Creates a standart textbox for a field.
    *************************************************************************/
    _createTextInput: function( options, name, value ) {
      var $input = $( '<input type="text" name="' + name + '"/>' );
      if ( options.inputClass != undefined ) {
        $input.addClass( options.inputClass );
      }
      if ( value != undefined ) {
        $input.val( value );
      }
      var $div = 
        $( '<div/>' )
          .addClass( 'jtable-input jtable-text-input' )
          .append( $input );
      return $div;
    },

    /* Creates a password input for a field.
    *************************************************************************/
    _createPasswordInput: function( options, name, value ) {
      var $input = $( '<input type="password" name="' + name + '"/>' );
      if ( options.inputClass != undefined ) {
        $input.addClass( options.inputClass );
      }
      if ( value != undefined ) {
        $input.val( value );
      }
      var $div = 
        $( '<div/>' )
          .addClass( 'jtable-input jtable-password-input' )
          .append( $input );
      return $div;
    },

    /* Creates a checkboxfor a field.
    *************************************************************************/
    _createCheckbox: function( options, name, value ) {

      var $input = $( '<input type="checkbox" name="' + name + '" />' );
      if ( options.inputClass ) {
        $input.addClass( options.inputClass );
      }

      var $text = $( '<span/>' )
      
      $input
        .on( 'change', function() {
          var val = $input.is( ':checked' ) ? 1 : 0;
          var text = this._getCheckBoxTextForFieldByValue.call( this, name, val );
          $text.text( text );
          $input.val( val );
        }.bind( this ) );

      var val = ( value || options.defaultValue ) == 1 ? true : false; 
      $input.attr( 'checked', val ).trigger( 'change' );
      
      var $div = 
        $( '<div/>' )
          .addClass( 'jtable-input jtable-checkbox-input' )
          .append( $input, $text );

      return $div;
    },

    /* Creates a drop down list (combobox) input element for a field.
    *************************************************************************/
    _createDropdownList: function( options, name, value, record, source, form ) {
      //Create select element
      var $input = $( '<select name="' + name + '"/>' );
      if ( options.inputClass != undefined ) {
        $input.addClass( options.inputClass );
      }
            
      //add options
      var values = this._getOptionsForField.call( this, name, {
        record: record,
        source: source,
        form: form,
        dependencies: this._createDependenciesUsingForm.call( this, form, options.dependsOn )
      } );

      var $div = 
        $( '<div/>' )
          .addClass( 'jtable-input jtable-dropdown-input' )
          .append( $input );
      
      this._fillDropdownListWithOptions.call( this, $input, values, value )

      return $div;
    },
        
    /* Fills a dropdown list with given options.
    *************************************************************************/
    _fillDropdownListWithOptions: function( $select, options, value ) {
      $select.empty();
      for ( var i = 0; i < options.length; i++ ) {
        var $option = $( '<option>' + options[i].DisplayText + '</option>' );
        $option.val( options[i].Value );
        if ( options[i].Value == value ) {
          $option.attr( 'selected', 'selected' );
        }
        $option.appendTo( $select );
      }
    },

        /* Creates Dependcy values object from given form.
        *************************************************************************/
        _createDependenciesUsingForm: function( $form, dependsOn ) {
          if ( !dependsOn ) {
            return {};
          }
          var values = {};
          for ( var i = 0; i < dependsOn.length; i++ ) {
            var field = dependsOn[i];
            var $dependsOn = $form.find( ":input[name='" + field + "']" );
            if ( $dependsOn.length <= 0 ) {
              continue;
            }
            values[field] = $dependsOn.val();
          }
          return values;
        },

        /* Creates a radio button list for a field.
        *************************************************************************/
        _createRadioButtonListForField: function( options, fieldName, value, record, source ) {
          var $containerDiv = 
            $( '<div/>' )
              .addClass( 'jtable-input jtable-radiobuttonlist-input' );

          var values = this._getOptionsForField.call( this, fieldName, {
            record: record,
            source: source
          } );

          $.each( values, function( i, option ) {
            var $radioButtonDiv = 
              $( '<div/>' )
                .addClass( 'jtable-radio-input' )
                .appendTo($containerDiv);

            var $radioButton = 
              $('<input type="radio" id="Edit-' + fieldName + '-' + i + '" class="' + options.inputClass + '" name="' + fieldName + '"' + ((option.Value == (value + '')) ? ' checked="true"' : '') + ' />')
                .val( option.Value )
                .appendTo( $radioButtonDiv );

            var $textSpan = 
              $('<span/>')
                .html( option.DisplayText )
                .appendTo( $radioButtonDiv );

            if ( field.setOnTextClick != false ) {
              $textSpan
                .addClass('jtable-option-text-clickable')
                .click( function() {
                  if ( !$radioButton.is( ':checked' ) ) {
                    $radioButton.attr( 'checked', true );
                  }
                } );
            }
          } );
          return $containerDiv;
        },

        /* Gets display text for a checkbox field.
        *************************************************************************/
        _getCheckBoxTextForFieldByValue: function( fieldName, value ) {
          var options = this.options.fields[fieldName];
          value = value || options.defaultValue;
          if ( options.values ) {
            var optVal = this._findOptionByValue.call( this, options.values, value );
            if ( optVal ) {
              return optVal.DisplayText;
            }
          }
          return value ? this.options.messages.yes : this.options.messages.no;
        },

        /* Returns true if given field's value must be checked state.
        *************************************************************************/
        _getIsCheckBoxSelectedForFieldByValue: function( fieldName, value ) {
          var values = this._createCheckBoxStateArrayForFieldWithCaching.call( this, fieldName );
          for ( var i = 0, max = values.length; i < max; i++ ) {
            return ( values[i].Value == value && !!values[i] == true );
          }
          return false;
        },

        /* Gets an object for a checkbox field that has Value and DisplayText
        *  properties.
        *************************************************************************/
        _getCheckBoxPropertiesForFieldByState: function( fieldName, checked ) {
          return this._createCheckBoxStateArrayForFieldWithCaching.call( this, fieldName )[(checked ? 1 : 0)];
        },

        /* Calls _createCheckBoxStateArrayForField with caching.
        *************************************************************************/
        _createCheckBoxStateArrayForFieldWithCaching: function( fieldName ) {
          var cacheKey = 'checkbox_' + fieldName;
          if ( !this._cache[cacheKey] ) {
            this._cache[cacheKey] = this._createCheckBoxStateArrayForField.call( this, fieldName );
          }
          return this._cache[cacheKey];
        },

        /* Creates a two element array of objects for states of a checkbox field.
        *  First element for unchecked state, second for checked state.
        *  Each object has two properties: Value and DisplayText
        *************************************************************************/
        _createCheckBoxStateArrayForField: function( fieldName ) {
          //var stateArray = [];
          var options = this.options.fields[fieldName].values;
          if ( $.isArray( options ) ) { 
            options = this._buildOptionsFromArray( options, true );
          } else { 
            options = this._buildOptionsArrayFromObject( options, true );
          }
          return options;
          //for ( var i = 0, max = Math.min( options.length, 2 ); i < max; i++ ) {
          //  stateArray.push( options[i] );
          //}
          //return stateArray;
        },

        /* Searches a form for Dependcy dropdowns and makes them cascaded.
        */
        _makeCascadeDropDowns: function( $form, record, source ) {
          var self = this;

          $form.find( 'select' ).each( function() {
            var $thisDropdown = $( this );

            //get field name
            var name = $thisDropdown.attr( 'name' );
            if ( !name ) {
              return;
            }

            var field = self.options.fields[name];
              
            //check if this combobox depends on others
            if ( !field.dependsOn ) {
              return;
            }

            //for each dependency
            $.each( field.dependsOn, function( index, dependsOnField ) {
              //find the Dependcy combobox
              $form
                .find( ":input[name='" + dependsOnField + "']" )
                  .on( 'change', function() {
                    //Refresh options
                    var funcParams = {
                        record: record,
                        source: source,
                        form: $form,
                        dependencies: self._createDependenciesUsingForm.call( self, $form, field.dependsOn )
                    };
                    var options = self._getOptionsForField.call( self, name, funcParams );
                    //Fill combobox with new options
                    self._fillDropdownListWithOptions.call( self, $thisDropdown, options, "" );
                    //Thigger change event to refresh multi cascade dropdowns.
                    $thisDropdown.trigger( 'change' );
                  } );
            } );
          } );
        },

        /* Sets enabled/disabled state of a dialog button.
        *************************************************************************/
        _setEnabledOfDialogButton: function( $button, enabled, buttonText ) {
          if ( !$button || $button.length == 0 ) {
            return;
          }
          if ( enabled ) {
            $button.removeAttr( 'disabled' );
          } else {
            $button.attr( 'disabled', 'disabled' );
          }
          if ( this.options.jqueryuiTheme ) {
            $button.toggleClass( 'ui-state-disabled', !enabled );
          }
          if ( buttonText ) {
            $button
              .find( 'span' )
              .text( buttonText );
          }
        }

    });

})(jQuery);


/************************************************************************
* CREATE RECORD extension for jTable                                    *
*************************************************************************/
(function($) {

  //Reference to base object members
  var base = {
    _createHeaderCommands: $.hik.jtable.prototype._createHeaderCommands,
    _createRowFromRecord: $.hik.jtable.prototype._createRowFromRecord
  };

  //extension members
  $.extend( true, $.hik.jtable.prototype, {

    /************************************************************************
    * DEFAULT OPTIONS / EVENTS                                              *
    *************************************************************************/
    options: {
      create: {
        use: false
      },
      icons: {
        create: 'ui-icon-plus',
        copy: 'ui-icon-plus',
        save: 'ui-icon-disk'
      },
      actions: {
        create: false
      },
      //Events
      recordAdded: function( event, data ) {},
      rowAdded: function( event, data ) {},

      //Localization
      messages: {
        create: {
          add: 'Add new record',
          copy: 'Copy record',
          progress: 'Creating record',
          failure: 'Failed to create record'
        }
      }
    },
    
    /************************************************************************
    * OVERRIDED METHODS *
    *************************************************************************/
    /* Overrides base method to add a 'editing column cell' to header row.
    *************************************************************************/
    _createHeaderCommands: function( $rowset ) {
      base._createHeaderCommands.apply( this, arguments );
      var isAllowed = !( !this.options.create || !this.options.create.use );
      if ( isAllowed && typeof this.options.create.use == 'function' ) {
        isAllowed = this.options.create.use.call( this );
      }
      if ( isAllowed ) {
        var $command = this._createEmptyCommandHeader.call( this, $rowset );
        var $button = this._creating.createAddButton.call( this );
        $button
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            this._creating.showForm.call( this );
          }.bind( this ) )
          .prependTo( $command );
      }
    },
    /* Overrides base method to add a 'edit command cell' to a row.
    *************************************************************************/
    _createRowFromRecord: function( record ) {
      var $rowset = base._createRowFromRecord.apply( this, arguments );
      var isAllowed = !( !this.options.copy || !this.options.copy.use );
      if ( isAllowed && typeof this.options.copy.use == 'function' ) {
        isAllowed = this.options.copy.use.call( this, record );
      }
      if ( isAllowed ) {
        var $command = this._createEmptyCommandColumn.call( this, $rowset );
        var $button = this._creating.createCopyButton.call( this );
        $button
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            this._creating.showForm.call( this, $rowset );
          }.bind( this ) )
          .prependTo( $command );
      }
      return $rowset;
    },     

    /************************************************************************
    * PRIVATE FIELDS & METHODS                                              *
    *************************************************************************/ 
    
    _creating: {
      createAddButton: function( text ) {
        var $span = $( '<span/>' )
          .attr( 'title', this.options.messages.create.add )
          .html( this.options.messages.create.add )
          .button( {
            text: !!text,
            icons: {
              primary: this.options.icons.create
            }
          } );
        return $span;
      },
      createCopyButton: function( text ) {
        var $span = $( '<span/>' )
          .attr( 'title', this.options.messages.create.copy )
          .html( this.options.messages.create.copy )
          .button( {
            text: !!text,
            icons: {
              primary: this.options.icons.copy
            }
          } );
        return $span;
      }, 
      showForm: function( rows ) {
        var $dialog = $( '<div/>' ); 
        var $buttons = $( '<div/>' )
          .addClass( 'clearfix jtable-form-buttons' );
        var $form = $( '<form/>' )
          .addClass( 'jtable-dialog-form jtable-create-form' );
        
        $( '<span/>' )
          .addClass( 'close' )
          .attr( 'title', this.options.messages.operations.cancel )
          .html( this.options.messages.operations.cancel )
          .appendTo( $buttons );
        $( '<span/>' )
          .addClass( 'reset' )
          .attr( 'title', this.options.messages.operations.reset )
          .html( this.options.messages.operations.reset )
          .appendTo( $buttons );
        $( '<span/>' )
          .addClass( 'submit' )
          .attr( 'title', this.options.messages.operations.save )
          .html( this.options.messages.operations.save )
          .appendTo( $buttons );
        var values = {};
        if ( rows && rows.length > 0 ) {
          $.extend( true, values, rows[0].data( 'record' ) );
        }
        for ( var i = 0, max = this._fieldList.length; i < max; i++ ) {
          var
            name = this._fieldList[i],
            options = this.options.fields[name],
            value = values[name];
          if ( options.key ) {
            value = null;
            delete values[name];
          }
          if ( rows && rows.length > 1 ) {
            for ( var j = 1, jmax = rows.length; j < jmax; j++ ) {
              var record = rows[j].data( 'record' );
              if ( !record || ( options.key && rows.length > 1 ) ) {
                continue;
              }
              if ( record[name] != value ) {
                value = null;
                delete values[name];
              }
            }
          }
          this._creating.createEditForField.call( this, $form, name, options, value );
        }
        this._makeCascadeDropDowns.call( this, $form, values, 'create' );
        $form
          .append( $buttons )
          .appendTo( $dialog );
        this._trigger.call( this, 'formCreated', null, { form: $form, formType: 'create', record: values, rows: rows } );
        this._creating.makeFormSubmittable.call( this, $form, $dialog );
        $dialog.dialog( {
          autoOpen: true,
          modal: true,
          width: 'auto',
          show: this.options.animations.dialogs.show,
          hide: this.options.animations.dialogs.hide,
          title: this.options.messages.create.add,
          close: function() {
            this._trigger.call( this, 'formClosed', null, { form: $form, formType: 'create', rows: rows } );
          }.bind( this )
        } );
      },
      createEditForField: function( $form, name, options, value ) {
        if ( options.create == false ) {
          return;
        }
        if ( options.type == 'hidden' ) {
          this._createHiddenInput.call( this, name, value )
            .appendTo( $form );
          return;
        }
        var $container =
          $( '<div class="jtable-input-field-container"/>' );
          this._createInputLabelForRecordField.call( this, name )
            .appendTo( $container );
          this._createInputForRecordField.call( this, name, 'edit', $form, value )
            .appendTo( $container );
        $container.appendTo( $form );
      },       
      makeFormSubmittable: function( $form, $dialog ) {
        var 
          $close = $form.find( '.jtable-form-buttons span.close' ),
          $submit = $form.find( '.jtable-form-buttons span.submit' ),
          $reset = $form.find( '.jtable-form-buttons span.reset' );
        
        $close
          .button( {
            icons: {
              primary: this.options.icons.operations.cancel
            }
          } )
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            $dialog.dialog( 'close' );
          }.bind( this ) );
        $reset
          .button( {
            icons: {
              primary: this.options.icons.operations.reset
            }
          } )
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            $form[0].reset();
          } );
        $submit
          .button( {
            icons: {
              primary: this.options.icons.edit
            }
          } )
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            this._setEnabledOfDialogButton.call( this, $submit, false );
            if ( this._trigger.call( this, 'formSubmitting', null, { form: $form, formType: 'create' } ) == false ) {
              this._setEnabledOfDialogButton.call( this, $submit, true );
              return;
            }
            var values = this._serializeObjects.call( this, $form.find( ':input' ) );
            this.addRecord.call( this, values, {
              success: function() {
                $dialog.dialog( 'close' );
              },
              error: function() {
                this._setEnabledOfDialogButton.call( this, $submit, true );
              }
            } );
          }.bind( this ) );
        }
    },
    /* Adds a new record to the table (optionally to the server also)
    *************************************************************************/
    addRecord: function( values, options ) {
      if ( !values ) {
        this._logWarn.call( this, 'addRecord: no values' );
        return;
      }
      
      if ( this._isBusy.call( this ) ) {
        this._logWarn.call( this, 'addRecord: jTable is busy' );
        return;
      }
      
      var settings = $.extend( true,
        {
          clientOnly: false,
          success: $.noop,
          error: function( message ) {
            this._showError.call( this, message );
          }
        }, 
        options );

      if ( !this.options.actions.create ) {
        this._logWarn.call( this, 'addRecord: No create action' );
      }      
          
      if ( !this.options.actions.create || settings.clientOnly ) {
        this._addRow.call( this, this._createRowFromRecord.call( this, values ), {
          isNewRow: true,
          index: settings.index
        } );
        settings.success.call( this );
        return;
      }
      
      var ajaxSettings = this._createAjaxSettings.call( this, this.options.actions.create, settings.ajaxSettings );
      
      var errors = [];      
      
      this._showBusy.call( this, this.options.messages.create.progress );
      
      var params = $.extend( true, { data: { record: values } }, ajaxSettings );
      
      var onDone = function( results ) {
        if ( results && results.Result ) {
          var newValues = $.extend( true, {}, values, results.Record );
          this._trigger.call( this, 'recordAdded', null, { record: newValues, results: results } );
          this._addRow.call( this, this._createRowFromRecord.call( this, newValues ), {
            isNewRow: true,
            index: settings.index
          } );
          settings.success.call( this );
          return;
        }
        var message = this.options.messages.create.failure;
        if ( results && results.Message ) {
          message += ': ' + results.Message;
        }
        errors.push( message );
      };
      
      var onFail = function( xhr, status, error ) {
        var message = this.options.messages.create.failure;
        errors.push( message + ': ' + error );
      };
      
      var onComplete = function() {
        this._hideBusy.call( this );
      };

      this._ajax.call( this, params )
        .done( onDone.bind( this ) )
        .fail( onFail.bind( this ) )
        .always( onComplete.bind( this ) );
    }
        
  } );

} )(jQuery);


/************************************************************************
* EDIT RECORD extension                                                 *
*************************************************************************/
(function($) {

  //Reference to base object members
  var base = {
    _createHeaderCommands: $.hik.jtable.prototype._createHeaderCommands,
    _createRowFromRecord: $.hik.jtable.prototype._createRowFromRecord
  };

    //extension members
  $.extend( true, $.hik.jtable.prototype, {

    /************************************************************************
    * DEFAULT OPTIONS / EVENTS                                              *
    *************************************************************************/
    options: {
      //Events
      edit: {
        use: false,
        icon: 'ui-icon-pencil' 
      },
      icons: {
        edit: 'ui-icon-pencil', 
        save: 'ui-icon-disk'
      },
      actions: {
        edit: false
      },
      recordUpdated: function( event, data ) { },
      rowUpdated: function( event, data ) { },
      //Localization
      messages: {
        edit: { 
          record: 'Edit',
          progress: 'Updating record',
          progressMultiple: 'Updating record {0} of {1}'
        }
      }
    },

    /************************************************************************
    * OVERRIDED METHODS                                                     *
    *************************************************************************/

    /* Overrides base method to add a 'editing column cell' to header row.
    *************************************************************************/
    _createHeaderCommands: function( $rowset ) {
      base._createHeaderCommands.apply( this, arguments );
      var isAllowed = !( !this.options.edit || !this.options.edit.use );
      if ( isAllowed && typeof this.options.edit.use == 'function' ) {
        isAllowed = this.options.edit.use.call( this );
      }
      if ( isAllowed ) {
        var $command = this._createEmptyCommandHeader.call( this, $rowset );
        if ( this.options.selecting && this.options.multiselect ) {
          var $button = this._edit.createButton.call( this );
          $button
            .on( 'click', function( event ) {
              if ( event.button != 0 ) {
                return;
              }
              this._edit.showForm.call( this, this._$selectedRows );
            }.bind( this ) )
            .prependTo( $command );
        }
      }
    },

    /* Overrides base method to add a 'edit command cell' to a row.
    *************************************************************************/
    _createRowFromRecord: function( record ) {
      var $rowset = base._createRowFromRecord.apply( this, arguments );
      var isAllowed = !( !this.options.edit || !this.options.edit.use );
      if ( isAllowed && typeof this.options.edit.use == 'function' ) {
        isAllowed = this.options.edit.use.call( this, record );
      }
      if ( isAllowed ) {
        var $command = this._createEmptyCommandColumn.call( this, $rowset );
        var $button = this._edit.createButton.call( this );
        $button
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            this._edit.showForm.call( this, [ $rowset ] );
          }.bind( this ) )
          .prependTo( $command );
      }
      return $rowset;
    },

    /************************************************************************
    * PRIVATE FIELDS & METHODS                                              *
    *************************************************************************/
    
    _edit: {
      createButton: function( text ) {
        var $span = $( '<span/>' )
          .attr( 'title', this.options.messages.edit.text )
          .html( this.options.messages.edit.text )
          .button( {
            text: !!text,
            icons: {
              primary: this.options.icons.edit 
            }
          } );
        return $span;
      },
      showForm: function( rows ) {
        if ( !rows || rows.length == 0 ) {
          return;
        }
        var $dialog = $( '<div/>' );  
        var $buttons = $( '<div/>' )
          .addClass( 'clearfix jtable-form-buttons' );
        var $form = $( '<form/>' )
          .addClass( 'jtable-dialog-form jtable-edit-form' );
        
        $( '<span/>' )
          .addClass( 'close' )
          .attr( 'title', this.options.messages.operations.cancel )
          .html( this.options.messages.operations.cancel )
          .appendTo( $buttons );
        $( '<span/>' )
          .addClass( 'reset' )
          .attr( 'title', this.options.messages.operations.reset )
          .html( this.options.messages.operations.reset )
          .appendTo( $buttons );
        $( '<span/>' )
          .addClass( 'submit' )
          .attr( 'title', this.options.messages.operations.save )
          .html( this.options.messages.operations.save )
          .appendTo( $buttons );
        
        var values = $.extend( true, {}, rows[0].data( 'record' ) );
        for ( var i = 0, max = this._fieldList.length; i < max; i++ ) {
          var 
            name = this._fieldList[i],
            options = this.options.fields[name],
            value = values[name];
          if ( rows.length > 1 && options.key ) {
            value = null;
            delete values[name];
          }
          for ( var j = 1, jmax = rows.length; j < jmax; j++ ) {
            var record = rows[j].data( 'record' );
            if ( !record || ( options.key && rows.length > 1 ) ) {
              continue;
            }
            if ( record[name] != value ) {
              value = null;
              delete values[name];
            }
          }
          this._edit.createEditForField.call( this, $form, name, options, value );
        }

        this._makeCascadeDropDowns.call( this, $form, values, 'edit' );
        
        $form
          .append( $buttons )
          .appendTo( $dialog );
         
        this._trigger.call( this, 'formCreated', null, { form: $form, formType: 'edit', record: values, rows: rows } );

        this._edit.makeFormSubmittable.call( this, $form, $dialog, rows );

        $dialog.dialog( {
          autoOpen: true,
          modal: true,
          width: 'auto',
          show: this.options.animations.dialogs.show,
          hide: this.options.animations.dialogs.hide,
          title: this.options.messages.edit.text,
          close: function() {
            this._trigger.call( this, 'formClosed', null, { form: $form, formType: 'edit', rows: rows } );
          }.bind( this )
        } );
      },
      createEditForField: function( $form, name, options, value ) {
        if ( options.key == true ) {
          if ( !options.edit ) {
            this._createHiddenInput.call( this, name, value )
              .appendTo( $form );
            return;
          } else {
            this._createHiddenInput.call( this, 'jtRecordKey', value )
              .appendTo( $form );
          }
        }
        if ( options.edit == false ) {
          return;
        }
        if ( options.type == 'hidden' ) {
          this._createHiddenInput.call( this, name, value )
            .appendTo( $form );
          return;
        }

        var $container = 
          $( '<div class="jtable-input-field-container"/>' );

        this._createInputLabelForRecordField.call( this, name )
          .appendTo( $container );

        this._createInputForRecordField.call( this, name, 'edit', $form, value )
          .appendTo( $container );

        $container.appendTo( $form );
      },
      
      makeFormSubmittable: function( $form, $dialog, rows ) {
        var 
          $close = $form.find( '.jtable-form-buttons span.close' ),
          $submit = $form.find( '.jtable-form-buttons span.submit' ),
          $reset = $form.find( '.jtable-form-buttons span.reset' );
        
        $close
          .button( {
            icons: {
              primary: this.options.icons.operations.cancel
            }
          } )
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            $dialog.dialog( 'close' );
          }.bind( this ) );
        $reset
          .button( {
            icons: {
              primary: this.options.icons.operations.reset
            }
          } )
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            $form[0].reset();
          } );
        $submit
          .button( {
            icons: {
              primary: this.options.icons.edit
            }
          } )
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            this._setEnabledOfDialogButton.call( this, $submit, false );
            if ( this._trigger.call( this, 'formSubmitting', null, { form: $form, formType: 'edit', rows: rows } ) == false ) {
              this._setEnabledOfDialogButton.call( this, $submit, true );
              return;
            }
            var values = this._serializeObjects.call( this, $form.find( ':input' ), rows.length > 1 );
            
            this.updateRows.call( this, rows, values, { 
              success: function() {
                $dialog.dialog( 'close' );
              },
              error: function() {
                this._setEnabledOfDialogButton.call( this, $submit, true );
              }
            } );
          }.bind( this ) );
      }

    },

    /************************************************************************
    * PUBLIC METHODS                                                        *
    *************************************************************************/
    
    updateInTable: function( $rowset, values ) {
      var record = $rowset.data( 'record' );
      $.extend( true, record, values );
      var $rowsetNew = this._createRowFromRecord.call( this, record );
      var index = this.getIndexOfRow( $rowset, this._$tableRows );
      if ( index > 0 ) {
        if ( this.options.selecting ) {
          this._deselectRows.call( this, $rowset );
        }
        $rowset.replaceWith( $rowsetNew );
        $rowset = this._$tableRows[index] = $rowsetNew;
        if ( this.options.selecting ) {
          this._selectRows.call( this, $rowsetNew  );
        }
        this._trigger.call( this, 'rowUpdated', null, { row: $rowsetNew } );
        if ( !this.options.animations.enabled ) {
          return;
        }
        var className = this.options.animations.rows.updated;
        if ( this.options.jqueryuiTheme ) {
          className = className + ' ui-state-highlight';
        }
        $rowset
          .stop( true, true )
          .addClass( className )
          .promise()
          .done( function() {
            $rowset.removeClass( className, this.options.animations.rows.delay, this.options.animations.rows.hide );
          }.bind( this ) );
      }
    },
    
    /* Updates a record on the table (optionally on the server also)
    *************************************************************************/
    updateRows: function( rows, values, options ) {
      if ( rows.length <= 0 ) {
        this._logWarn.call( this, 'updateRows: No rows' );
        return;
      }
      
      if ( this._isBusy.call( this ) ) {
        this._logWarn.call( this, 'updateRows: jTable is busy' );
        return;
      }

      var settings = $.extend( true, 
        {
          clientOnly: false,
          success: $.noop,
          error: function( message ) {
            this._showError.call( this, message );
          }
        }, 
        options );
      
      if ( !this.options.actions.edit ) {
        this._logWarn.call( this, 'updateRows: No update action' );
      }
      
      if ( !this.options.actions.edit || settings.clientOnly ) {
        for ( var i = 0, max = rows.length; i < max; i++ ) {
          var $rowset = $( rows[i] );
          this.updateInTable.call( this, $rowset );
        }
        settings.success.call( this );
        return;
      }

      var ajaxSettings = this._createAjaxSettings.call( this, this.options.actions.edit, settings.ajaxSettings ); 

      var completedCount = 0;
      var successCount = 0;
      
      var errors = [];
      
      for ( var i = 0, max = rows.length; i < max; i++ ) {
        var $rowset = $( rows[i] );
        var title = max == 1 ? this.options.messages.edit.progress : this.options.messages.edit.progressMultiple.format( completedCount, max ); 

        if ( $rowset.data( 'updating' ) == true ) {
          return;
        }
        $rowset.data( 'updating', true );
        
        this._showBusy.call( this, title );
        
        var record = $rowset.data( 'record' );

        var params = $.extend( true, { data: { record: {} } }, ajaxSettings );
        $.extend( true, params.data.record, this._getKeyValueOfRecord.call( this, record ), values );

        var onDone = function( i, $rowset, results ) {
          if ( results && results.Result ) {
            ++successCount;
            var newValues = $.extend( true, {}, $rowset.data( 'record' ), values, results.Record );
            this._trigger.call( this, 'recordUpdated', null, { record: newValues, results: results } );
            this.updateInTable.call( this, $rowset, newValues );
            return;
          }
          var message = max == 1 ? this.options.messages.edit.failure : this.options.messages.edit.failureMultiple.format( i + 1, max );
          if ( results && results.Message ) {
            message += ': ' + results.Message;
          }
          errors.push( message );
        };
        
        var onFail = function( i, xhr, status, error ) {
          var message = max == 1 ? this.options.messages.edit.failure : this.options.messages.edit.failureMultiple.format( i + 1, max );
          errors.push( message + ': ' + error );
        };
        
        var onComplete = function( $rowset ) {
          $rowset.data( 'updating', false );
          ++completedCount;
          if ( completedCount == max ) {
            this._hideBusy.call( this );
            if ( successCount == max ) {
              settings.success.call( this );
            } else {
              var message = errors.join( '<br/>' );
              this._showError.call( this, message );
              settings.error.call( this, message );
            }
          }
        };

        this._ajax.call( this, params )
          .done( onDone.bind( this, i, $rowset ) )
          .fail( onFail.bind( this, i ) )
          .always( onComplete.bind( this, $rowset ) );
      }
    }

  } );

} )(jQuery);


/************************************************************************
* DELETE RECORD extension                                               *
*************************************************************************/
( function( $ ) {

  //Reference to base object members
  var base = {
    _createHeaderCommands: $.hik.jtable.prototype._createHeaderCommands,
    _createRowFromRecord: $.hik.jtable.prototype._createRowFromRecord,
  };

  //extension members
  $.extend( true, $.hik.jtable.prototype, {

    /************************************************************************
    * DEFAULT OPTIONS / EVENTS                                              *
    *************************************************************************/
    options: {
      //Options
      remove: {
        use: false,
        confirmation: true
      },
      icons: {
        remove: 'ui-icon-trash' 
      },
      //Events
      recordDeleted: function( event, record ) {
      },
      actions: {
        remove: false
      },
      //Localization
      messages: {
        remove: {
          text: 'Delete',
          progress: 'Deleting record',
          progressMultiple: 'Deleting record {0} of {1}',
          confirmation: 'Confirm deletion',
          failure: 'Can not delete record',
          failureMultiple: 'Can not delete record {0} of {1}'
        }
      }
    },

    /************************************************************************
    * OVERRIDES                                                        *
    *************************************************************************/

    _createHeaderCommands: function( $rowset ) {
      base._createHeaderCommands.apply( this, arguments );
      var isAllowed = !( !this.options.remove || !this.options.remove.use );
      if ( isAllowed && typeof this.options.remove.use == 'function' ) {
        isAllowed = this.options.remove.use.call( this );
      }
      if ( isAllowed ) {
        var $command = this._createEmptyCommandHeader.call( this, $rowset );
        if ( this.options.selecting && this.options.multiselect ) {
          var $button = this._remove.createButton.call( this );
          $button
            .on( 'click', function( event ) {
              if ( event.button != 0 ) {
                return;
              }
              this._remove.showForm.call( this, this._$selectedRows );
            }.bind( this ) )
            .prependTo( $command );
        }
      }
    },

    _createRowFromRecord: function( record ) {
      var $rowset = base._createRowFromRecord.apply( this, arguments );
      var isAllowed = !( !this.options.remove || !this.options.remove.use );
      if ( isAllowed && typeof this.options.remove.use == 'function' ) {
        isAllowed = this.options.remove.use.call( this, record );
      }
      if ( isAllowed ) {
        var $command = this._createEmptyCommandColumn.call( this, $rowset );
        var $button = this._remove.createButton.call( this );
        $button
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            this._remove.showForm.call( this, [ $rowset ] );
          }.bind( this ) )
          .prependTo( $command );
      }
      return $rowset;
    },

    /************************************************************************
    * PRIVATE FIELDS & METHODS                                                        *
    *************************************************************************/

    _remove: {
      createButton: function( text ) {
        var $span = $( '<span/>' )
          .attr( 'title', this.options.messages.remove.text )
          .html( this.options.messages.remove.text )
          .button( {
            text: !!text,
            icons: {
              primary: this.options.icons.remove
            }
          } );
        return $span;
      },
      showForm: function( rows ) {
        if ( !rows || rows.length == 0 ) {
          return;
        }
        var $dialog = $( '<div/>' );  
        var $buttons = $( '<div class="clearfix jtable-form-buttons"/>' );
        
        $( '<span class="close"/>' )
          .attr( 'title', this.options.messages.operations.cancel )
          .html( this.options.messages.operations.cancel )
          .appendTo( $buttons );

        $( '<span class="submit"/>' )
          .attr( 'title', this.options.messages.remove.text )
          .html( this.options.messages.remove.text )
          .appendTo( $buttons );
        
        var $form = $( '<form class="jtable-dialog-form jtable-delete-form"/>' )
          .append( $buttons )
          .appendTo( $dialog );
         
        this._trigger.call( this, 'formCreated', null, { form: $form, formType: 'delete', rows: rows } );

        this._remove.makeFormSubmittable.call( this, $form, $dialog, rows ); 

        $dialog.dialog( {
          autoOpen: true,
          modal: true,
          resizable: false,
          width: 'auto',
          minHeight: 'auto',
          show: this.options.animations.dialogs.show,
          hide: this.options.animations.dialogs.hide,
          title: this.options.messages.remove.confirmation,
          close: function() {
            this._trigger.call( this, 'formClosed', null, { form: $form, formType: 'delete', rows: rows } );
          }.bind( this )
        } );
        
      },
      makeFormSubmittable: function( $form, $dialog, rows ) {
        var 
          $close = $form.find( '.jtable-form-buttons span.close' ),
          $submit = $form.find( '.jtable-form-buttons span.submit' ),
          $reset = $form.find( '.jtable-form-buttons span.reset' );
        
        $close
          .button( {
            icons: {
              primary: this.options.icons.operations.cancel
            }
          } )
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            $dialog.dialog( 'close' );
          }.bind( this ) );
        $reset
          .button( {
            icons: {
              primary: this.options.icons.operations.reset
            }
          } )
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            $form[0].reset();
          } );
        $submit
          .button( {
            icons: {
              primary: this.options.icons.remove
            }
          } )
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            this._setEnabledOfDialogButton.call( this, $submit, false );
            if ( this._trigger.call( this, 'formSubmitting', null, { form: $form, formType: 'delete', rows: rows } ) == false ) {
              this._setEnabledOfDialogButton.call( this, $submit, true );
              return;
            }
            this.deleteRows.call( this, rows, { 
              success: function() {
                $dialog.dialog( 'close' );
              },
              error: function() {
                this._setEnabledOfDialogButton.call( this, $submit, true );
              }
            } );
          }.bind( this ) );
      }
    },

    /************************************************************************
    * PUBLIC METHODS                                                        *
    *************************************************************************/

    deleteFromTable: function( $rowset ) {
      if ( !this.options.animations.enabled ) {
        this._removeRowsetFromTable.call( this, $rowset, 'deleted' );
        return;
      }
      var className = this.options.animations.rows.deleting;
      if ( this.options.jqueryuiTheme ) {
        className = className + ' ui-state-disabled';
      }
      $rowset
        .stop( true, true )
        .addClass( className, 'slow' )
        .promise()
        .done( function() {
          this._removeRowsetFromTable.call( this, $rowset, 'deleted' );
        }.bind( this ) );
    },
    
    deleteRows: function( rows, options ) {
      if ( rows.length <= 0 ) {
        this._logWarn.call( this, 'deleteRows: No rows' );
        return;
      }
      
      if ( this._isBusy.call( this ) ) {
        this._logWarn.call( this, 'deleteRows: jTable is busy' );
        return;
      }

      settings = $.extend( true, 
        {
          clientOnly: false,
          success: $.noop,
          error: function( message ) {
            this._showError.call( this, message );
          }
        }, 
        options );
      
      if ( !this.options.actions.remove ) {
        this._logWarn.call( this, 'deleteRows: No remove action' );
      }
      if ( !this.options.actions.remove || settings.clientOnly ) {
        for ( var i = 0, max = rows.length; i < max; i++ ) {
          var $rowset = $( rows[i] );
          this.deleteFromTable.call( this, $rowset );
        }
        settings.success.call( this );
        return;
      }

      ajaxSettings = this._createAjaxSettings.call( this, this.options.actions.remove, settings.ajaxSettings ); 

      var completedCount = 0;
      var successCount = 0;
      
      var errors = [];
      
      for ( var i = 0, max = rows.length; i < max; i++ ) {
        var $rowset = $( rows[i] );
        var title = max == 1 ? this.options.messages.remove.progress : this.options.messages.remove.progressMultiple.format( completedCount, max ); 

        if ( $rowset.data( 'deleting' ) == true ) {
          return;
        }
        $rowset.data( 'deleting', true );
        
        this._showBusy.call( this, title );
        
        var record = $rowset.data( 'record' );

        var params = $.extend( true, { data: { record: {} } }, ajaxSettings );
        $.extend( true, params.data.record, this._getKeyValueOfRecord.call( this, record ) );

        var onDone = function( i, $rowset, results ) {
          if ( results && results.Result ) {
            ++successCount;
            this._trigger.call( this, "recordDeleted", null, { record: $rowset.data( 'record' ), results: results } );
            this.deleteFromTable.call( this, $rowset );
            return;
          }
          var message = max == 1 ? this.options.messages.remove.failure : this.options.messages.remove.failureMultiple.format( i + 1, max );
          if ( results && results.Message ) {
            message += ': ' + results.Message;
          }
          errors.push( message );
        };

        var onFail = function( i, xhr, status, error ) {
          var message = max == 1 ? this.options.messages.remove.failure : this.options.messages.remove.failureMultiple.format( i + 1, max );
          errors.push( message + ': ' + error );
        };
        
        var onComplete = function( $rowset ) {
          $rowset.data( 'deleting', false );
          ++completedCount;
          if ( completedCount == max ) {
            this._hideBusy.call( this );
            if ( successCount == max ) {
              settings.success.call( this );
            } else {
              var message = errors.join( '<br/>' );
              settings.error.call( this, message );
            }
          }
        };
        
        this._ajax.call( this, params )
          .done( onDone.bind( this, i, $rowset ) )
          .fail( onFail.bind( this, i ) )
          .always( onComplete.bind( this, $rowset ) );
      }
    }
    
  } );

} )( jQuery );


/************************************************************************
* SELECTING extension for jTable                                        *
*************************************************************************/
( function( $ ) {

    //Reference to base object members
  var base = {
    _create: $.hik.jtable.prototype._create,
    _createHeaderCommands: $.hik.jtable.prototype._createHeaderCommands,
    _createRowFromRecord: $.hik.jtable.prototype._createRowFromRecord,
    _onLoadingRecords: $.hik.jtable.prototype._onLoadingRecords,
    _onRecordsLoaded: $.hik.jtable.prototype._onRecordsLoaded,
    _onRowsRemoved: $.hik.jtable.prototype._onRowsRemoved,
    _removeRowsetFromTable: $.hik.jtable.prototype._removeRowsetFromTable
  };

    //extension members
  $.extend( true, $.hik.jtable.prototype, {

    /************************************************************************
    * DEFAULT OPTIONS / EVENTS                                              *
    *************************************************************************/
    options: {
      //Options
      selecting: false,
      multiselect: false,
      selectingCheckboxes: false,
      selectOnRowClick: false,
      //Events
      selectionChanged: function( event, data ) { }
    },

    /************************************************************************
    * PRIVATE FIELDS                                                        *
    *************************************************************************/

    _selectedRecordIdsBeforeLoad: null, //This array is used to store selected row Id's to restore them after a page refresh (string array).
    _$selectAllCheckbox: null, //Reference to the 'select/deselect all' checkbox (jQuery object)
    _shiftKeyDown: false, //True, if shift key is currently down.
    _$selectedRows: [],

    /************************************************************************
    * CONSTRUCTOR                                                           *
    *************************************************************************/

    /* Overrides base method to do selecting-specific constructions.
    *************************************************************************/
    _create: function() {
      base._create.apply( this, arguments );
      if ( this.options.selecting && this.options.selectingCheckboxes ) {
        this._bindKeyboardEvents();
      }
    },

    /* Registers to keyboard events those are needed for selection
    *************************************************************************/
    _bindKeyboardEvents: function() {
      var self = this;
      //Register to events to set _shiftKeyDown value
      $( document )
        .on( 'keydown', function( event ) {
          switch( event.which ) {
            case 16:
              self._shiftKeyDown = true;
              break;
          }
        } )
        .on( 'keyup', function( event ) {
          switch ( event.which ) {
            case 16:
              self._shiftKeyDown = false;
              break;
          }
        } );
    },

    /************************************************************************
    * PUBLIC METHODS                                                        *
    *************************************************************************/

    /* Gets jQuery selection for currently selected rows.
    *************************************************************************/
    selectedRows: function() {
      return this._$selectedRows;
    },

    /* Makes row/rows 'selected'.
    *************************************************************************/
    selectRows: function( rows ) {
      this._selectRows.apply( this, rows );
      this._refreshSelectAllCheckboxState.call( this );
      this._onSelectionChanged.call( this );
    },
    
    deselectRows: function( rows ) {
      this._deselectRows.apply( this, rows );
      this._refreshSelectAllCheckboxState.call( this );
      this._onSelectionChanged.call( this );
    },

    /************************************************************************
    * OVERRIDED METHODS                                                     *
    *************************************************************************/

    _createHeaderCommands: function( $rowset ) {
      base._createHeaderCommands.apply( this, arguments );
      if ( this.options.selecting && this.options.selectingCheckboxes ) {
        this._createHeaderSelectionTool.call( this, $rowset );
      }
    },

    _createRowFromRecord: function() {
      var $rowset = base._createRowFromRecord.apply( this, arguments );
      if ( this.options.selecting ) {
        this._createRowSelectionTool.call( this, $rowset );
      }
      return $rowset;
    },

    /* Overrides base event to store selection list
    *************************************************************************/
    _onLoadingRecords: function() {
      if ( this.options.selecting ) {
        this._storeSelectionList.call( this );
      }
      base._onLoadingRecords.apply( this, arguments );
    },

    /* Overrides base event to restore selection list
    *************************************************************************/
    _onRecordsLoaded: function() {
      base._onRecordsLoaded.apply( this, arguments );
      if ( this.options.selecting ) {
        this._restoreSelectionList.call( this );
      }
    },

    /* Overrides base event to check is any selected row is being removed.
    *************************************************************************/
    _onRowsRemoved: function( $rows, reason ) {
      if ( this.options.selecting && ( reason != 'reloading' ) && ( $rows.filter( '.jtable-row-selected' ).length > 0 ) ) {
        this._onSelectionChanged.call( this );
      }
      base._onRowsRemoved.apply( this, arguments );
    },
    
    _removeRowsetFromTable: function( $rowset, reason ) {
      if ( this.options.selecting ) {
        this._deselectRows.call( this, $rowset );
      }
      base._removeRowsetFromTable.apply( this, arguments );
    },

    /************************************************************************
    * PRIVATE METHODS                                                       *
    *************************************************************************/

    _createHeaderSelectionTool: function( $rowset ) {
      $command = 
        $( '<th/>' )
          .addClass( 'jtable-column-header-selecting' );
      this._jqueryuiThemeAddClass.call( this, $command, 'ui-state-default' );
      if ( $rowset.length > 1 ) {
        $command.attr( 'rowspan', $rowset.length );
      }
      $rowset.eq( 0 ).prepend( $command );
      if ( this.options.multiselect && this._$selectAllCheckbox == null ) {
        this._$selectAllCheckbox = this._createSelectAllCheckbox.call( this );
        $command.append( this._$selectAllCheckbox );
      }
    },
    
    _createRowSelectionTool: function( $rowset ) {
      function _update( event ) {
        if ( event.button != 0 ) {
          return;
        }
        this._invertRowSelection.call( this, $rowset );
        this._refreshSelectAllCheckboxState.call( this );
        this._onSelectionChanged.call( this );
      }
      //Select/deselect on row click
      if ( this.options.selectOnRowClick ) {
        $rowset.on( 'click', _update.bind( this ) );
      }
      //'select/deselect' checkbox column
      if ( this.options.selectingCheckboxes ) {
        //var $command = this._createEmptyCommandColumn.call( this, $row );
        var $command = 
          $( '<td/>' )
            .addClass( 'jtable-command-column-header' )
            .addClass( 'jtable-selecting-column' );
        $command.css( {
          'width': '20px',
          'min-width': '20px',
          'max-width': '20px'
        } );
        if ( $rowset.length > 1 ) {
          $command.attr( 'rowspan', $rowset.length );
        }
        $rowset.eq( 0 ).prepend( $command );
        var $checkbox = $( '<input type="checkbox"/>' );
        if ( !this.options.selectOnRowClick ) {
          $checkbox.on( 'click', function( event ) {
            _update.call( this, event, $rowset );
          }.bind( this ) );
        }
        $command.append( $checkbox );
      }
    },

    /* Creates a header column to select/deselect all rows.
    *************************************************************************/
    _createSelectAllCheckbox: function() {
      var $checkbox = 
        $( '<input type="checkbox"/>' )
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            if ( $( event.currentTarget ).is( ':checked' ) ) {
              this._selectRows.apply( this, this._$tableRows );
            } else {
              this._deselectRows.apply( this, this._$tableRows );
            }
            this._onSelectionChanged.call( this );
          }.bind( this ) );
      return $checkbox;
    },

    /* Stores Id's of currently selected records to _selectedRecordIdsBeforeLoad.
    *************************************************************************/
    _storeSelectionList: function() {
      if ( !this.options.selecting ) {
        return;
      }
      this._selectedRecordIdsBeforeLoad = [];
      for ( var i = 0, max = this._$selectedRows.length; i < max; i++ ) {
        this._selectedRecordIdsBeforeLoad.push( this._getKeyValueOfRecord.call( this, $( this._$selectedRows[i] ).data( 'record' ) ) );
      };
    },

    /* Selects rows whose Id is in _selectedRecordIdsBeforeLoad;
    *************************************************************************/
    _restoreSelectionList: function() {
      if ( !this.options.selecting ) {
        return;
      }
      var selectedRowCount = 0;
      for ( var i = 0, max = this._selectedRecordIdsBeforeLoad.length; i < max; ++i ) {
        this._selectRows.call( this, this.getRowByKey.call( this, this._selectedRecordIdsBeforeLoad[i] ) );
        ++selectedRowCount;
      }
      if ( this._selectedRecordIdsBeforeLoad.length > 0 && this._selectedRecordIdsBeforeLoad.length != selectedRowCount ) {
        this._onSelectionChanged.call( this );
      }
      this._selectedRecordIdsBeforeLoad = [];
      this._refreshSelectAllCheckboxState.call( this );
    },

    /* Inverts selection state of a single row.
    *************************************************************************/
    _invertRowSelection: function( $rowset, shift ) {
      if ( $rowset.hasClass( 'jtable-row-selected' ) ) {
        this._deselectRows.call( this, $rowset );
      } else if ( shift ) {
        var rowIndex = this.getIndexOfRow( $rowset, this._$tableRows );
        //try to select row and above rows until first selected row
        var beforeIndex = this._findFirstSelectedRowIndexBeforeIndex.call( this, rowIndex ) + 1;
        if ( beforeIndex > 0 && beforeIndex < rowIndex ) {
          this._selectRows( this._$tableBody.find( 'tr' ).slice( beforeIndex, rowIndex + 1 ) );
        } else {
          //try to select row and below rows until first selected row
          var afterIndex = this._findFirstSelectedRowIndexAfterIndex.call( this, rowIndex) - 1;
          if ( afterIndex > rowIndex ) {
            this._selectRows.call( this, this._$tableBody.find( 'tr' ).slice( rowIndex, afterIndex + 1 ) );
          } else {
            //just select this row
            this._selectRows.call( this, $rowset );
          }
        }
      } else {
        this._selectRows.call( this, $rowset );
      }
      this._onSelectionChanged.call( this );
    },

    /* Search for a selected row (that is before given row index) to up and returns it's index 
    *************************************************************************/
    _findFirstSelectedRowIndexBeforeIndex: function( rowIndex ) {
      for ( var i = rowIndex - 1; i >= 0; --i ) {
        if ( this._$tableRows[i].hasClass( 'jtable-row-selected' ) ) {
          return i;
        }
      }
      return -1;
    },

    /* Search for a selected row (that is after given row index) to down and returns it's index 
    *************************************************************************/
    _findFirstSelectedRowIndexAfterIndex: function( rowIndex ) {
      for ( var i = rowIndex + 1, max = this._$tableRows.length; i < max; ++i ) {
        if ( this._$tableRows[i].hasClass( 'jtable-row-selected' ) ) {
          return i;
        }
      }
      return -1;
    },

    /* Makes row/rows 'selected'.
    *************************************************************************/
    _selectRows: function() {
      if ( !this.options.multiselect ) {
        this._deselectRows.apply( this, this._$selectedRows );
      }
      for ( var i = 0, max = arguments.length; i < max; i++ ) {
        var $rowset = arguments[i];
        if ( !$rowset || $rowset.length == 0 ) {
          continue;
        }
        $rowset.addClass( 'jtable-row-selected' );
        this._jqueryuiThemeAddClass.call( this,  $rowset, 'ui-state-highlight ');
        if ( this.options.selectingCheckboxes ) {
          $rowset.find('.jtable-selecting-column :input').prop( 'checked', true );
        }
        this._$selectedRows.push( $rowset );
      }
      this._refreshSelectAllCheckboxState.call( this );
    },

    /* Makes row/rows 'non selected'.
    *************************************************************************/
    _deselectRows: function() {
      for ( var i = 0, max = arguments.length; i < max; i++ ) {
        var $rowset = arguments[i];
        if ( !$rowset || $rowset.length == 0 ) {
          continue;
        }
        var index = this.getIndexOfRow( $rowset, this._$selectedRows );
        if ( index > -1 ) {
          this._$selectedRows.splice( index, 1 );
        }
        $rowset.removeClass( 'jtable-row-selected ui-state-highlight' );
        if ( this.options.selectingCheckboxes ) {
          $rowset.find( '.jtable-selecting-column :input' ).prop( 'checked', false );
        }
      }
      this._refreshSelectAllCheckboxState.call( this );
    },

    /* Updates state of the 'select/deselect' all checkbox according to count of selected rows.
    *************************************************************************/
    _refreshSelectAllCheckboxState: function() {
      if ( !this.options.selectingCheckboxes || !this.options.multiselect ) {
        return;
      }

      var totalRowCount = this._$tableRows.length;
      var selectedRowCount = this._$selectedRows.length;

      if ( selectedRowCount == 0 || totalRowCount == 0 ) {
        this._$selectAllCheckbox.prop( 'indeterminate', false );
        this._$selectAllCheckbox.attr( 'checked', false );
      } else if ( selectedRowCount == totalRowCount ) {
        this._$selectAllCheckbox.prop( 'indeterminate', false );
        this._$selectAllCheckbox.attr( 'checked', true );
      } else {
        this._$selectAllCheckbox.removeAttr( 'checked' );
        this._$selectAllCheckbox.prop( 'indeterminate', true );
      }
    },

    /************************************************************************
    * EVENT RAISING METHODS                                                 *
    *************************************************************************/

    _onSelectionChanged: function() {
      this._trigger( 'selectionChanged', null, {} );
    }

  } );

})(jQuery);


/************************************************************************
* PAGING extension for jTable                                           *
*************************************************************************/
(function($) {

    //Reference to base object members
  var base = {
    load: $.hik.jtable.prototype.load,
    _create: $.hik.jtable.prototype._create,
    _setOption: $.hik.jtable.prototype._setOption,
    _createRecordLoadUrl: $.hik.jtable.prototype._createRecordLoadUrl,
    _addRow: $.hik.jtable.prototype._addRow,
    _removeRowsetFromTable: $.hik.jtable.prototype._removeRowsetFromTable,
    _onRecordsLoaded: $.hik.jtable.prototype._onRecordsLoaded
  };

  //extension members
  $.extend(true, $.hik.jtable.prototype, {

    /************************************************************************
    * DEFAULT OPTIONS / EVENTS                                              *
    *************************************************************************/
    options: {
      paging: {
        use: false,
        top: false,
        bottom: true,
        list: 'normal', //possible values: 'minimal', 'normal'
        size: 10,
        sizes: [10, 25, 50, 100, 250, 500],
        sizeChange: true,
        gotoInput: 'combobox' //possible values: 'textbox', 'combobox', 'none'
      },
      messages: {
        paging: {
          info: 'Showing {0}-{1} of {2}',
          page: 'Go to page',
          size: 'Rows per page'
        }
      }
    },

    /************************************************************************
     * OVERRIDED METHODS                                                     *
     *************************************************************************/

    /* Overrides base method to do paging-specific constructions.
    *************************************************************************/
    _create: function() {
      base._create.apply( this, arguments );
      if ( this.options.paging && this.options.paging.use ) {
        this._paging.loadSettings.call( this );
        if ( this.options.paging.top ) {
          var panel = this._paging.createPanel.call( this );
          panel.$panel.insertBefore( this._$tableBody );
          this._paging.panels.push( panel );
        }
        if ( this.options.paging.bottom ) {
          var panel = this._paging.createPanel.call( this );
          panel.$panel.insertAfter( this._$tableBody );
          this._paging.panels.push( panel );
        }
      }
    },


    /* Overrides load method to set current page to 1.
    *************************************************************************/
    load: function() {
      this._paging.current = 1;
      base.load.apply( this, arguments );
    },

    /* Used to change options dynamically after initialization.
    *************************************************************************/
    _setOption: function( key, value ) {
      base._setOption.apply( this, arguments );
      if ( key == 'pageSize' ) {
        this._paging.changeSize.call( this, parseInt( value ) );
      }
    },

    /* Overrides _createRecordLoadUrl method to add paging info to URL.
    *************************************************************************/
    _createRecordLoadUrl: function() {
      var params = base._createRecordLoadUrl.apply( this, arguments );
      return this._paging.addInfoToUrl.call( this, params, this._paging.current );
    },

    /* Overrides _addRow method to re-load table when a new row is created.
    *************************************************************************/
    _addRow: function( $rowset, options ) {
      if ( this.options.paging && this.options.paging.use && options && options.isNewRow ) {
        this._reloadTable.call( this );
      } else {
        base._addRow.apply( this, arguments );
      }
    },

    /* Overrides _removeRowsetFromTable method to re-load table when a row is removed from table.
    *************************************************************************/
    _removeRowsetFromTable: function( $rows, reason ) {
      base._removeRowsetFromTable.apply( this, arguments );
      if ( this.options.paging && this.options.paging.use ) {
        if ( this._$tableRows.length == 0 && this._paging.current > 1 ) {
          --this._paging.current;
          this._reloadTable.call( this );
        }
      }
    },

    /* Overrides _onRecordsLoaded method to to do paging specific tasks.
    *************************************************************************/
    _onRecordsLoaded: function( data ) {
      base._onRecordsLoaded.apply( this, arguments );
      if ( this.options.paging && this.options.paging.use ) {
        this._paging.total = data.TotalRecordCount;
        this._paging.update.call( this );
      }
    },


    /************************************************************************
    * PRIVATE FIELDS & METHODS                                              *
    *************************************************************************/

    _paging: {
      total: 0, //Total count of records on all pages
      current: 1, //Current page number
      panels: [], //Reference to the panels at the bottom / top of the table (jQuery object)
    
      /* Changes current page size with given value.
      *************************************************************************/
      changeSize: function( size ) {
        if ( size == this.options.paging.size ) {
          return;
        }
        this.options.paging.size = size;

        //Normalize current page
        var count = this._paging.calculateCount.call( this );
        if ( this._paging.current > count ) {
          this._paging.current = count;
        }
        if ( this._paging.current <= 0 ) {
          this._paging.current = 1;
        }
        
        if ( this.options.paging.sizeChange ) {
          for ( var i = 0, max = this._paging.panels.length; i < max; i++ ) {
            var panel = this._paging.panels[i];
            if ( parseInt( panel.$sizeChange.val() ) != size ) {
              var $option = panel.$sizeChange.find( 'option[value=' + size + ']' );
              if ( $option.length > 0 ) {
                panel.$sizeChange.val( size ).trigger( 'change' );
              }
            }
          }
        }

        this._paging.saveSettings.call( this );
        this._reloadTable.call( this );
      },

      /* Saves user preferences for paging
      *************************************************************************/
      saveSettings: function() {
        if ( !this.options.saveUserPreferences ) {
          return;
        }
        this._setCookie.call( this, 'page-size', this.options.paging.size );
      },
    
      /* Loads user preferences for paging.
      *************************************************************************/
      loadSettings: function() {
        if ( !this.options.saveUserPreferences ) {
          return;
        }

        var size = this._getCookie.call( this, 'page-size' );
        if ( size ) {
          this.options.paging.size = this._normalizeNumber.call( this, size, 1, 1000000, this.options.paging.size );
        }
      },
      
      /* Adds jtStartIndex and jtPageSize parameters to a URL as query string.
      *************************************************************************/
      addInfoToUrl: function( ajaxSettings, pageNumber ) {
        if ( !( this.options.paging && this.options.paging.use ) ) {
          return ajaxSettings;
        }

        var jtStartIndex = ( pageNumber - 1 ) * this.options.paging.size;
        var jtPageSize = this.options.paging.size;
          
        ajaxSettings.data = $.extend( true, {}, ajaxSettings.data, { jtStartIndex: jtStartIndex, jtPageSize: jtPageSize } );
        return ajaxSettings;
      },

      /* Creates bottom panel and adds to the page.
      *************************************************************************/
      createPanel: function() {
        var $info = 
          $( '<div/>' )
            .addClass( 'jtable-page-info' );
        var $list = 
          $( '<div/>' )
            .addClass( 'jtable-page-list' );

        var $gotoArea = null, $gotoInput = null;
        if ( this.options.paging.gotoInput && this.options.paging.gotoInput != 'none' ) {
          if ( this.options.paging.gotoInput == 'combobox' ) {
            $gotoInput = this._paging.createGotoCombobox.call( this );
            /*
            $gotoInput.select2( {
              minimumResultsForSearch: 10,
              selectOnBlur: true
            } );
            */
          } else { //textbox
            $gotoInput = this._paging.createGotoInput.call( this );
          }
          $gotoArea = 
            $( '<div />' )
              .addClass( 'jtable-goto-page' )
              .append( '<span>' + this.options.messages.paging.page + ': </span>' )
              .append( $gotoInput );
        }
            
        var $sizeChangeArea = null, $sizeChange = null;
        if ( this.options.paging.sizeChange ) {
          //Add current page size to page sizes list if not contains it
          var size = parseInt( this.options.paging.size );
          if ( this.options.paging.sizes.indexOf( size ) < 0 ) {
            this.options.paging.sizes.push( size );
            this.options.paging.sizes.sort( function( a, b ) { return a - b; } );
          }
          //Add a span to contain page size change items
          $sizeChange = this._paging.createSizeCombobox.call( this );
          $sizeChangeArea = 
            $( '<div/>' )
              .addClass( 'jtable-page-size-change' )
              .append( '<span>' + this.options.messages.paging.size + ': </span>' )
              .append( $sizeChange );
        }
        
        var $left = $( '<div />' )
          .addClass( 'jtable-left-area' )
          .append( $list )
          .append( $sizeChangeArea )
          .append( $gotoArea );
        var $right = $( '<div />' )
          .addClass( 'jtable-right-area' )
          .append( $info );

        var $th = 
          $( '<th colspan="' + this._colspan + '"/>' )
            .addClass( 'jtable-bottom-panel jtable-command-column-header' )
            .append( $left )
            .append( $right );

        this._jqueryuiThemeAddClass.call( this, $th, 'ui-state-default' );
          
        var $panel = $( '<tbody/>' );

        $( '<tr/>' )
          .append( $th )
          .appendTo( $panel );
        
        var panel = { 
          $panel: $panel,
          $left: $left,
          $right: $right,
          $list: $list,
          $info: $info,
          $sizeChange: $sizeChange,
          $gotoArea: $gotoArea,
          $gotoInput: $gotoInput
        };
        
        this._paging.updateGoto.call( this, panel );
        this._paging.updateSize.call( this, panel );
        
        return panel;
      },


      /* Update paging information.
      *************************************************************************/
      update: function() {
        for ( var i = 0, max = this._paging.panels.length; i < max; i++ ) {
          var panel = this._paging.panels[i];
          this._paging.updateInfo.call( this, panel );
          this._paging.updateList.call( this, panel );
          this._paging.updateGoto.call( this, panel );
          this._paging.updateSize.call( this, panel );
        }
      },
      
      createSizeCombobox: function() {
        var $input = $( '<select/>' );
        for ( var i = 0; i < this.options.paging.sizes.length; i++ ) {
          var size = this.options.paging.sizes[i];
          $input.append( $( '<option value="' + size + '">' + size + '</option>' ) );
        }
        $input
          .on( 'change', function( event ) {
            this._paging.changeSize.call( this, parseInt( $( event.currentTarget ).val() ) );
          }.bind( this ) )
          .val( this.options.paging.size );
        return $input;
      },

      createGotoCombobox: function() {
        var $input = $( '<select/>' );
        $input
          .append( '<option value="1">1</option>' )
          .data( 'page-count', 1 )
          .on( 'change', function( event ) {
            this._paging.changePage.call( this, parseInt( $( event.currentTarget ).val() ) );
          }.bind( this ) );
        return $input;
      },
        
      createGotoInput: function() {
        var $input = 
          $( '<input type="text" maxlength="10" value="' + this._paging.current + '" />' )
            .keypress( function( event ) {
              if ( event.which == 13 ) { //enter
                event.preventDefault();
                this._changePage( parseInt( this._$gotoPageInput.val() ) );
              } else if ( event.which == 43 ) { // +
                event.preventDefault();
                this._changePage( parseInt( this._$gotoPageInput.val() ) + 1 );
              } else if (event.which == 45 ) { // -
                event.preventDefault();
                this._changePage( parseInt( this._$gotoPageInput.val() ) - 1 );
              } else {
                //Allow only digits
                var isValid = (
                  ( 47 < event.keyCode && event.keyCode < 58 && event.shiftKey == false && event.altKey == false )
                      || ( event.keyCode == 8 )
                      || ( event.keyCode == 9 )
                );
  
                if ( !isValid ) {
                  event.preventDefault();
                }
              }
            }.bind( this ) );
        return $input;
      },

      updateInfo: function( panel ) {
        if ( panel.$info == null ) {
          return;
        }
        panel.$info.empty();
        if ( this._paging.total <= 0 ) {
          return;
        }
        var start = ( this._paging.current - 1 ) * this.options.paging.size + 1;
        var end = this._paging.current * this.options.paging.size;
        end = this._normalizeNumber.call( this, end, start, this._paging.total, 0 );

        if ( end >= start ) {
          var message = this.options.messages.paging.info.format( start, end, this._paging.total );
          panel.$info.html( message );
        }
      },
      
      updateSize: function( panel ) {
      },
      
      /* Refreshes the 'go to page' input.
      *************************************************************************/
      updateGoto: function( panel ) {
        if ( !this.options.paging.gotoInput || this.options.paging.gotoInput == 'none') {
          return;
        }

        if ( this._paging.total <= 0 ) {
          panel.$gotoArea.hide();
        } else {
          panel.$gotoArea.show();
        }

        if ( this.options.paging.gotoInput == 'combobox' ) {
          var oldCount = panel.$gotoInput.data( 'page-count' );
          var count = this._paging.calculateCount.call( this );
          if ( oldCount != count ) {
            panel.$gotoInput.empty();

            //Skip some pages is there are too many pages
            var step = 1;
            if ( count > 10000 ) {
              step = 100;
            } else if ( count > 5000 ) {
              step = 10;
            } else if ( count > 2000 ) {
              step = 5;
            } else if ( count > 1000 ) {
              step = 2;
            }

            for ( var i = step; i <= count; i += step ) {
              panel.$gotoInput.append( '<option value="' + i + '">' + i + '</option>' );
            }
            panel.$gotoInput.data( 'page-count', count );
          }
        }
        panel.$gotoInput.val( this._paging.current );
      },

      /* Updates page list.
      *************************************************************************/
      updateList: function( panel ) {
        if ( this.options.paging.size <= 0 ) {
          return;
        }
        panel.$list.empty();
        if ( this._paging.total <= 0 ) {
          return;
        }
        var count = this._paging.calculateCount.call( this );
      
        var $b1 = this._paging.createFirstAndPrevious.call( this );
        panel.$list.append( $b1 );
        if ( this.options.paging.list == 'normal' || this.options.paging.list ) {
          var $b3 = this._paging.createNumbers.call( this, this._paging.calculateNumbers.call( this, count ) );
          panel.$list.append( $b3 );
        }
        var $b2 = this._paging.createLastAndNext.call( this, count );
        panel.$list.append( $b2 );
      },

      /* Creates and shows previous and first page links.
      *************************************************************************/
      createFirstAndPrevious: function() {
        var $first = 
          $( '<span/>' )
            .addClass( 'jtable-page-number-first' )
            .html( '&lt&lt' )
            .data( 'page', 1 );
        this._paging.bindClickEvents.call( this, $first );
        var $previous = 
          $( '<span/>' )
            .addClass( 'jtable-page-number-previous' )
            .html( '&lt' )
            .data( 'page', this._paging.current - 1 );
        this._paging.bindClickEvents.call( this, $previous );
        var $buttons = $( $first ).add( $previous );
        this._jqueryuiThemeAddClass.call( this, $buttons, 'ui-button ui-state-default', 'ui-state-hover' );
        if ( this._paging.current <= 1 ) {
          $buttons.addClass( 'jtable-page-number-disabled' );
          this._jqueryuiThemeAddClass.call( this, $buttons, 'ui-state-disabled');
        }
        return $buttons;
      },

      /* Creates and shows next and last page links.
      *************************************************************************/
      createLastAndNext: function( count ) {
        var $next = 
          $( '<span/>' )
            .addClass( 'jtable-page-number-next' )
            .html( '&gt' )
            .data( 'page', this._paging.current + 1 );
        this._paging.bindClickEvents.call( this, $next );
        var $last = 
          $( '<span/>' )
            .addClass( 'jtable-page-number-last' )
            .html( '&gt&gt' )
            .data( 'page', count );
        this._paging.bindClickEvents.call( this, $last );
        var $buttons = $( $next ).add( $last );
        this._jqueryuiThemeAddClass.call( this, $buttons, 'ui-button ui-state-default', 'ui-state-hover' );
        if ( this._paging.current >= count ) {
          $buttons.addClass( 'jtable-page-number-disabled' );
          this._jqueryuiThemeAddClass.call( this, $buttons, 'ui-state-disabled');
        }
        return $buttons;
      },

      /* Creates and shows page number links for given number array.
      *************************************************************************/
      createNumbers: function( numbers ) {
        var previousNumber = 0;
        var $buttons = $();
        for ( var i = 0, max = numbers.length; i < max; i++ ) {
          var number = numbers[i];
          if ( ( number - previousNumber ) > 1 ) {
            var $span = 
              $( '<span/>')
                .addClass('jtable-page-number-space')
                .html('...' );
            $buttons = $( $buttons ).add( $span );
          }
          var $button = this._paging.createNumber.call( this, number );
          this._paging.bindClickEvents.call( this, $button );
          $buttons = $( $buttons ).add( $button );
          previousNumber = number;
        }
        return $buttons;
      },

      /* Creates a page number link and adds to paging area.
      *************************************************************************/
      createNumber: function( number ) {
        var $button = 
          $( '<span/>' )
            .addClass( 'jtable-page-number' )
            .html( number )
            .data( 'page', number );

        this._jqueryuiThemeAddClass.call( this, $button, 'ui-button ui-state-default', 'ui-state-hover' );
            
        if ( this._paging.current == number ) {
          $button.addClass( 'jtable-page-number-active jtable-page-number-disabled' );
          this._jqueryuiThemeAddClass.call( this, $button, 'ui-state-active' );
        }
        return $button;
      },

      /* Calculates total page count according to page size and total record count.
      *************************************************************************/
      calculateCount: function() {
        var count = Math.floor( this._paging.total / this.options.paging.size);
        if ( this._paging.total % this.options.paging.size != 0 ) {
          ++count;
        }
        return count;
      },

      /* Calculates page numbers and returns an array of these numbers.
      *************************************************************************/
      calculateNumbers: function( count ) {
        if ( count <= 4 ) {
          //Show all pages
          var numbers = [];
          for ( var i = 1; i <= count; ++i ) {
            numbers.push( i );
          }
          return numbers;
        } else {
          var shownNumbers = [ 1, 2, count - 1, count];
          var previous = this._normalizeNumber.call( this, this._paging.current - 1, 1, count, 1 );
          var next = this._normalizeNumber.call( this, this._paging.current + 1, 1, count, 1 );

          this._insertToArrayIfDoesNotExists.call( this, shownNumbers, previous );
          this._insertToArrayIfDoesNotExists.call( this, shownNumbers, this._paging.current );
          this._insertToArrayIfDoesNotExists.call( this, shownNumbers, next );

          shownNumbers.sort( function(a, b) { return a - b; } );
          return shownNumbers;
        }
      },

      /* Binds click events of all page links to change the page.
      *************************************************************************/
      bindClickEvents: function( $button ) {
        $button.on( 'click', function( event ) {
          if ( event.button != 0 ) {
            return;
          }
          if ( $button.hasClass( 'jtable-page-number-disabled' ) ) {
            return;
          }
          this._paging.changePage.call( this, $button.data( 'page' ) );
        }.bind( this ) );
      },

      /* Changes current page to given value.
      *************************************************************************/
      changePage: function( page ) {
        page = this._normalizeNumber.call( this, page, 1, this._paging.calculateCount.call( this ), 1 );
        if ( page == this._paging.current ) {
          for ( var i = 0, max = this._paging.panels.length; i < max; i++ ) {
            this._paging.updateGoto.call( this, this._paging.panels[i] );
          }
        } else {
          this._paging.current = page;
          this._reloadTable.call( this );
        }
      }
    }
    
  } );

})(jQuery);


/************************************************************************
* SORTING extension for jTable                                          *
*************************************************************************/
(function($) {

  //Reference to base object members
  var base = {
    _initializeFields: $.hik.jtable.prototype._initializeFields,
    _normalizeFieldOptions: $.hik.jtable.prototype._normalizeFieldOptions,
    _createHeaderCell: $.hik.jtable.prototype._createHeaderCell,
    _createRecordLoadUrl: $.hik.jtable.prototype._createRecordLoadUrl
  };

  //extension members
  $.extend( true, $.hik.jtable.prototype, {

    /************************************************************************
    * DEFAULT OPTIONS / EVENTS                                              *
    *************************************************************************/
    options: {
      sorting: false,
      multiSorting: false
    },

    /************************************************************************
    * PRIVATE FIELDS                                                        *
    *************************************************************************/
    _lastSorting: null, //Last sorting of the table
    _$sortedList: [],

    /************************************************************************
    * OVERRIDED METHODS                                                     *
    *************************************************************************/
    /* Overrides base method to create sorting array.
    *************************************************************************/
    _initializeFields: function() {
      base._initializeFields.apply( this, arguments );
      this._lastSorting = {};
      if ( this.options.sorting ) {
        this._buildDefaultSortingArray.call( this );
      }
    },

    /* Overrides _normalizeFieldOptions method to normalize sorting option for fields.
    *************************************************************************/
    _normalizeFieldOptions: function( name, options ) {
      base._normalizeFieldOptions.apply( this, arguments );
      if ( typeof options.sorting == 'undefined' ) {
        options.sorting = this.options.sorting || false;
      }
    },

    /* Overrides _createHeaderCell to make columns sortable.
    *************************************************************************/
    _createHeaderCell: function( name, options ) {
      var $cell = base._createHeaderCell.apply( this, arguments );
      if ( options.sorting ) {
        this._makeColumnSortable.call( this, $cell, name );
      }
      return $cell;
    },

    /* Overrides _createRecordLoadUrl to add sorting specific info to URL.
    *************************************************************************/
    _createRecordLoadUrl: function() {
      var ajaxSettings = base._createRecordLoadUrl.apply( this, arguments );
      return this._addSortingInfoToUrl.call( this, ajaxSettings );
    },

    /************************************************************************
    * PRIVATE METHODS                                                       *
    *************************************************************************/

    /* Builds the sorting array according to defaultSorting string
    *************************************************************************/
    _buildDefaultSortingArray: function() {
      var self = this;
        
      if ( typeof self.options.defaultSorting == undefined ) {
        return;
      }
      if ( typeof self.options.defaultSorting == "string" ) {
        $.each( self.options.defaultSorting.split( "," ), function( orderIndex, orderValue ) {
          var 
            sort = orderValue.split( " " ),
            fieldName = sort[0],
            sortType = sort[1].toLowerCase(),
            fieldProps = self.options.fields[fieldName];
          if ( fieldProps == undefined ) {
            return;
          }
          if ( fieldProps.sorting ) {
            if ( sortType == 'desc' ) {
              self._lastSorting[fieldName] = 'desc';
            } else {
              self._lastSorting[fieldName] = 'asc';
            }
          }
        } );
      } else {
        for ( var fieldName in self.options.defaultSorting ) {
          var
            sortType = self.options.defaultSorting[fieldName].toLowerCase(),
            fieldProps = self.options.fields[fieldName];
          if ( fieldProps == undefined ) {
            return;
          }
          if ( fieldProps.sorting ) {
            if ( sortType == 'desc' ) {
              self._lastSorting[fieldName] = 'desc';
            } else {
              self._lastSorting[fieldName] = 'asc';
            }
          }
        }
      }
    },

    /* Makes a column sortable.
    *************************************************************************/
    _makeColumnSortable: function( $div, name ) {
      $div
        .addClass( 'jtable-column-header-sortable' )
        .on( 'click', function( event ) {
          if ( event.button != 0 ) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          this._sortTableByColumn.call( this, $div, name, event.ctrlKey );
        }.bind( this ) );

      var sortType = this._lastSorting[name];
      if ( sortType == 'asc' ) {
        $div.addClass( 'jtable-column-header-sorted-asc' );
        this._$sortedList.push( $div );
      } else if ( sortType == 'desc' ) {
        $div.addClass( 'jtable-column-header-sorted-desc' );
        this._$sortedList.push( $div );
      }
    },

      /* Sorts table according to a column header.
      *************************************************************************/
      _sortTableByColumn: function( $div, name, ctrlKey ) {
        var sortType = this._lastSorting[name];
        //Remove sorting styles from all columns except this one
        if ( !( this.options.multiSorting && ctrlKey ) ) {
          //clear previous sorting
          this._lastSorting = {};
          for ( var i = 0, max = this._$sortedList.length; i < max; i++ ) {
            this._$sortedList[i].removeClass( 'jtable-column-header-sorted-asc jtable-column-header-sorted-desc' );
          }
          this._$sortedList = [];
        } else {
          delete this._lastSorting[name];
          var index = this._$sortedList.indexOf( $div );
          if ( index > -1 ) {
            this._$sortedList.splice( index, 1 );
          }
        }

        if ( sortType == 'asc' ) {
          this._lastSorting[name] = 'desc';
          this._$sortedList.push( $div );
          $div.removeClass( 'jtable-column-header-sorted-asc' ).addClass( 'jtable-column-header-sorted-desc' );
        } else if ( sortType == 'desc' ) {
          $div.removeClass( 'jtable-column-header-sorted-desc' );
        } else {
          this._lastSorting[name] = 'asc';
          this._$sortedList.push( $div );
          $div.addClass( 'jtable-column-header-sorted-asc' );
        }

        //Load current page again
        this._reloadTable.call( this );
      },

      /* Adds jtSorting parameter to a URL as query string.
      *************************************************************************/
    _addSortingInfoToUrl: function( ajaxSettings ) {
      if ( !this.options.sorting || this._lastSorting.length == 0 ) {
        return ajaxSettings;
      }
      ajaxSettings.data = $.extend( true, {}, ajaxSettings.data, { jtSorting: this._lastSorting } );
      return ajaxSettings;
    }
  } );

} )(jQuery);

/************************************************************************
* MASTER/CHILD tables extension for jTable                              *
*************************************************************************/
(function($) {

  //Reference to base object members
  var base = {
    _removeRowsetFromTable: $.hik.jtable.prototype._removeRowsetFromTable
  };

  //extension members
  $.extend( true, $.hik.jtable.prototype, {

    /************************************************************************
    * DEFAULT OPTIONS / EVENTS                                              *
    *************************************************************************/
    options: {
      openChildAsAccordion: false
    },


    /************************************************************************
    * OVERRIDED METHODS                                                     *
    *************************************************************************/

    /* Overrides _removeRowsetFromTable method to remove child rows of deleted rows.
    *************************************************************************/
    _removeRowsetFromTable: function( $rowset, reason ) {
      if ( reason == 'deleted' ) {
        var $childRow = this.getChild.call( this, $rowset, false );
        if ( $childRow ) {
          this.closeChild.call( this, $childRow );
          $childRow.remove();
        }
      }
      base._removeRowsetFromTable.apply( this, arguments );
    },
    
    /************************************************************************
    * PUBLIC METHODS                                                        *
    *************************************************************************/

    /* Creates and opens a new child table for given row.
    *************************************************************************/
    openChildTable: function( $rowset, options, onOpened ) {

      var $childRow = this.getChild.call( this, $rowset, false );
      if ( $childRow ) {
        this.toggleChild.call( this, $childRow );
        return;
      }
      var tableOptions = {};
      tableOptions.ajaxSettings = $.extend( true, {}, this.options.ajaxSettings );
      tableOptions.actions = $.extend( true, {}, this.options.actions );
      tableOptions.jqueryuiTheme = this.options.jqueryuiTheme;
      tableOptions.showCloseButton = ( tableOptions.showCloseButton != false );
      //Close child table when close button is clicked (default behavior)
      if ( tableOptions.showCloseButton && !tableOptions.closeRequested ) {
        tableOptions.closeRequested = function() {
          this.closeChild.call( this, this.getChild.call( this, $rowset ) );
        }.bind( this );
      }
      $.extend( true, tableOptions, options );
      $childRow = this.getChild.call( this, $rowset, true, tableOptions );
      this.openChild.call( this, $childRow );
    },

    /* Gets child row for given row, opens it if it's closed (Creates if needed).
    *************************************************************************/
    getChild: function( $rowset, create, options ) {
      var $childRow = $rowset.data( 'childRow' );
      if ( !$childRow && create ) {
        $childRow = this._masterChild.createChild.call( this, $rowset, options );
      }
      return $childRow;
    },
    
    toggleChild: function( $childRow, open ) {
      if ( !$childRow ) {
        return;
      }
      var isOpen = $childRow.is( ':visible' );
      if ( open === false && isOpen ) {
        this._masterChild.hide.call( this, $childRow );
      } else if ( open == true && !isOpen ) {
        this._masterChild.show.call( this, $childRow );
      } else if ( isOpen ) {
        this._masterChild.hide.call( this, $childRow );
      } else if ( !isOpen ) {
        this._masterChild.show.call( this, $childRow );
      }
    },

    openChild: function( $childRow ) {
      if ( !$childRow ) {
        return;
      }
      var isOpen = $childRow.is( ':visible' ); 
      if ( !isOpen ) {
        if ( this.options.openChildAsAccordion ) {
          for ( var i = 0, max = this._$tableRows.length; i < max; i++ ) {
            var $childRow2 = this.getChild.call( this, this._$tableRows[i], false );
            if ( $childRow2 ) {
              this._masterChild.hide.call( this, $childRow2 );
            }
          }
        }
        this._masterChild.show.call( this, $childRow );
      }
    },

    closeChild: function( $childRow ) {
      if ( !$childRow ) {
        return;
      }
      var isOpen = $childRow.is( ':visible' ); 
      if ( isOpen ) {
        this._masterChild.hide.call( this, $childRow );
      }
    },

    /************************************************************************
    * PRIVATE METHODS                                                       *
    *************************************************************************/
    
    /* Creates a child row for a row, hides and returns it.
     *************************************************************************/
    _masterChild: {
      createChild: function( $rowset, options ) {
        var $table = 
          $( '<div/>' )
            .addClass( 'jtable-child-table-container' );
        var $col = $( '<td/>' )
          .attr( 'colspan', this._colspan )
          .append( $table );
        var $childRow = 
          $( '<tr/>' )
            .addClass( 'jtable-child-row' )
            .append( $col )
            .hide();
        $table.jtable( options );
        $rowset
          .after( $childRow )
          .data( 'childRow', $childRow );
        return $childRow;
      },
      hide: function( $childRow ) {
        $childRow.hide();
        return;
        if ( this.options.animations.enabled ) {
          $childRow.slideUp();
        } else {
          $childRow.hide();
        }
      },
      show: function( $childRow ) {
        $childRow.find( '.jtable-child-table-container' ).jtable( 'reload' );
        $childRow.show();
        return;
        if ( this.options.animations.enabled ) {
          $childRow.slideDown();
        } else {
          $childRow.show();
        }
      }
    }

  } );

} )(jQuery);

