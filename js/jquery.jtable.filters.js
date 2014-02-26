/************************************************************************
* DATA FILTERING extension for jTable                                  *
* Author: Guillermo Bisheimer                                           
* Rev. 1.0
*************************************************************************/
(function( $ ) {

  //Reference to base object members
  var base = {
    _normalizeFieldOptions: $.hik.jtable.prototype._normalizeFieldOptions,
    _createTableHead: $.hik.jtable.prototype._createTableHead,
    _createRowFromRecord: $.hik.jtable.prototype._createRowFromRecord
  };

  //extension members
  $.extend( true, $.hik.jtable.prototype, {

    /************************************************************************
     * DEFAULT OPTIONS / EVENTS                                              *
     *************************************************************************/
    options: {
      filter: {
        use: true,
        icons: {
        }
      },
      messages: {
        filter: {
          show: 'Show/hide filters',
          apply: 'Apply filter',
          disable: 'Disable filter',
          clear: 'Clear filter',
          range: {
            from: 'From',
            to: 'To'
          }
        }
      }
    },

    /************************************************************************
     * OVERRIDED METHODS                                                     *
     *************************************************************************/

    _normalizeFieldOptions: function( name, options ) {
      base._normalizeFieldOptions.apply( this, arguments );
      if ( this.options.filter && this.options.filter.use ) {
        if ( typeof options.filter == 'undefined' ) {
          options.filter = true;
        }
      }
    },

    _createTableHead: function() {
      var $thead = base._createTableHead.apply( this, arguments );
      if ( this.options.filter && this.options.filter.use ) {
        this._filter.createHeader.call( this, $thead );
      }
      return $thead;
    },
      
    _createRowFromRecord: function() {
      var $rowset = base._createRowFromRecord.apply( this, arguments );
      if ( this.options.filter && this.options.filter.use ) {
        this._createEmptyCommandColumn.call( this, $rowset );
      }
      return $rowset;
    },
    
    /*************************************************************************
     * PRIVATE FIELDS & METHODS                                              *
     *************************************************************************/
    _filter: {
      $row: null,
      $form: null,
      createApplyButton: function( opts ) {
        var $b = 
          $( '<span/>' )
            .html( this.options.messages.filter.apply )
            .button( opts )
            .on( 'click', function( event ) {
              if ( event.button != 0 ) {
                return;
              }
              this._filter.applyFilter.call( this );
            }.bind( this ) );
        return $b;
      },
      createDisableButton: function( opts ) {
        var $b = 
          $( '<span/>' )
            .html( this.options.messages.filter.disable )
            .button( opts )
            .on( 'click', function( event ) {
              if ( event.button != 0 ) {
                return;
              }
              this._filter.disableFilter.call( this );
            }.bind( this ) );
        return $b;
      },
      
      createClearButton: function( opts ) {
        var $b = 
          $( '<span/>' )
            .html( this.options.messages.filter.clear )
            .button( opts )
            .on( 'click', function( event ) {
              if ( event.button != 0 ) {
                return;
              }
              this._filter.clearFilter.call( this );
            }.bind( this ) );
        return $b;
      },
    
      createHeader: function( $thead ) {

        this._filter.$form = $( '<form id="jtable-filter-form" class="jtable-filter-form"/>' );
        this._filter.$row = $();
        
        var $row = null;
        for ( var i = 0; i < this._columnList.length; i++ ) {
          var 
            name = this._columnList[i],
            options = this.options.fields[name];
          var $cell = this._filter.createCell.call( this, name, options );
          if ( this.options.banded ) {
            var row = 1; 
            if ( options.rows && options.rows.start > 0 ) {
              row = options.rows.start;
            }
            $row = this._filter.$row.eq( row - 1 );
          }
          if ( !$row || $row.length == 0 ) {
            $row = $( '<tr/>' );
            this._filter.$row = $( this._filter.$row ).add( $row );
          }
          var $th = 
            $( '<th/>' )
              .addClass( 'jtable-column-filter-header' )
              .addClass( options.listClass )
              .append( $cell )
              .appendTo( $row );
          this._jqueryuiThemeAddClass.call( this, $th, 'ui-state-default' );
          if ( this.options.banded ) {
            if ( options.columns && options.columns.count > 0 ) {
              $th.attr( 'colspan', options.columns.count );
            }
            if ( options.rows && options.rows.count > 0 ) {
              $th.attr( 'rowspan', options.rows.count );
            }
          }
          
        }
  
        this._createHeaderCommands.call( this, this._filter.$row );
      
        $command = this._createEmptyCommandHeader.call( this, this._filter.$row );
        $command
          .html( '' )
          .append( this._filter.createApplyButton.call( this, { text: false, icons: { primary: 'ui-icon-filter' } } ) )
          .append( this._filter.createDisableButton.call( this, { text: false, icons: { primary: 'ui-icon-filter-disable' } } ) )
          .append( this._filter.createClearButton.call( this, { text: false, icons: { primary: 'ui-icon-filter-clear' } } ) );
  
        $thead.append( this._filter.$row );
      },

      /* Creates a header cell for given field.
      *  Returns th jQuery object.
      *************************************************************************/
      createCell: function( name, options ) {
        var $cell = 
          $( '<div/>' )
            .addClass( 'jtable-input-field-container' );
        var input = this._filter.createField.call( this, name, options );
        if ( input.length > 0 ) {
          $cell
            .on( 'keyup', ':input', function( event ) {
              if ( event.keyCode == 13 ) {
                event.stopPropagation();
                event.preventDefault();
                $( event.currentTarget ).trigger( 'change' );
              }
            } )
            .append( input );
        }
        return $cell;
      },
    
      createField: function( name, options ) {
        var result = [];
        if ( !options.filter ) {
          return result;
        }
        if ( options.list == false ){
          result.push( this._createInputLabelForRecordField.call( this, name ) );
        }
        if ( options.filter == 'range' ) {
          //Create input element with it's current value
          var $field = 
            this._createInputForRecordField.call( this, name, 'filter', this._filter.$form )
              .find( '[name]' )
              .attr( 'name', fieldName + '_from' );
          var $label = $( '<label>' + self.options.messages.filter.range.from + '</label>' );
  
          var $field2 = 
            this._createInputForRecordField.call( this, name, 'filter', this._filter.$form )
              .find( '[name]' )
              .attr( 'name', fieldName + '_to' );
          var $label2 = $( '<label>' + self.options.messages.filter.range.to + '</label>' );
                  
          var $divFrom = 
            $( '<div class="jtable-input-field-container-group"></div>' )
              .append( $label )
              .append( $field );
          var $divTo = 
            $( '<div class="jtable-input-field-container-group"></div>' )
              .append( $label2 )
              .append( $field2 );
            
          $field.on( 'change', this._filter.applyFilter.bind( this ) );
          $field2.on( 'change', this._filter.applyFilter.bind( this ) );
          
          result.push( $divFrom );
          result.push( $divTo );
          
        } else {
          //Create input element with it's current value
          var $field = this._createInputForRecordField.call( this, name, 'filter', this._filter.$form );
          $field.on( 'change', this._filter.applyFilter.bind( this ) );
  
          result.push( $field );
          
        }
        return result;
      },
        
      applyFilter: function( data ) {
        if ( this._filter.timeout ) {
          clearTimeout( this._filter.timeout );
        }
        var data = this._serializeObjects.call( this, this._filter.$row.find( ':input' ), true );
        this._lastPostData = $.extend( true, {}, this._lastPostData );
        delete this._lastPostData.jtFilter;
        $.extend( true, this._lastPostData, { jtFilter: data } );
        if ( !this._lastPostData.jtFilter ) {
          this._filter.disableFilter.call( this );
        } else {
          this._filter.timeout = setTimeout( function() {
            this._reloadTable.call( this, function() {
              this._$mainContainer.addClass( 'jtable-main-container-filtered' );
            }.bind( this ) );
          }.bind( this ), 300 );
        }
      },
      /* Disable current table filter
      *************************************************************************/
      disableFilter: function () {
        if ( this._filter.timeout ) {
          clearTimeout( this._filter.timeout );
        }
        this._lastPostData = $.extend( true, {}, this._lastPostData );
        delete this._lastPostData.jtFilter;
        this._filter.timeout = setTimeout( function() {
          this._reloadTable.call( this, function() {
            this._$mainContainer.removeClass( 'jtable-main-container-filtered' );
          }.bind( this ) );
        }.bind( this ), 300 );
      },
      /* Clears current table filter
      *************************************************************************/
      clearFilter: function () {
        this._filter.$form.trigger( 'reset' );
        this._filter.$row.find( ':input' ).each( function() {
          switch( this.type ) {
            case 'checkbox':
            case 'radio':
              this.checked = false;
              break;
            default:
              $( this ).val( '' );
              break;
          }
          $( this ).trigger( 'change' );
        } );
        this._filter.disableFilter.call( this );
      }
    }
  } );

})(jQuery);
