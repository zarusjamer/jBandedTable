/************************************************************************
* SELECT2 extension for jTable                                  *
* Dependency: Select2                                           
* Rev. 1.0
*************************************************************************/
(function( $ ) {
  if ( typeof $.fn.select2 == 'function' ) {
    var base1 = {
      _paging: {
        updateGoto: $.hik.jtable.prototype._paging.updateGoto,
        updateSize: $.hik.jtable.prototype._paging.updateSize
      },
      _fillDropdownListWithOptions: $.hik.jtable.prototype._fillDropdownListWithOptions
    };
    $.extend( true, $.hik.jtable.prototype, {
      
      _paging: {
        updateGoto: function( panel ) {
          base1._paging.updateGoto.apply( this, arguments );
          panel.$gotoInput.select2( {
            placeholder: '',
            minimumResultsForSearch: 10,
            selectOnBlur: true
          } );
        },
        updateSize: function( panel ) {
          base1._paging.updateSize.apply( this, arguments );
          panel.$sizeChange.select2( {
            placeholder: '',
            minimumResultsForSearch: 10,
            selectOnBlur: true
          } );
        }
      },
      _fillDropdownListWithOptions: function( $select, options, value ) {
        base1._fillDropdownListWithOptions.apply( this, arguments );
        $select.select2( {
          placeholder: '',
          allowClear: true,
          autoWidth: false,
          minimumResultsForSearch: 10
        } );
      }
    } );
  }
  if ( typeof $.fn.datepicker == 'function' ) {
    var base2 = {
      _createDateInput: $.hik.jtable.prototype._createDateInput
    };
    $.extend( true, $.hik.jtable.prototype, {
      options: {
        icons: {
          datepicker: 'ui-icon-calendar'
        },
        datepicker: {
          language: 'en'
        },
        messages: {
          datepicker: {
            text: 'Choose date'
          }
        }
      },
      _createDateInput: function( options, name, value ) {
        var $div = base2._createDateInput.apply( this, arguments );

        var 
          settings = {
            title: this.options.messages.datepicker.text,
            format: options.displayFormat || this.options.defaultDateFormat,
            yearRange: "-100:+0",
            language: this.options.datepicker.language
          };

        var
          $dp = $div.find( ':input' ).datepicker( settings );
        
        $picker = $( '<span class="ui-datepicker-trigger">' + settings.title + '</span>' )
          .button( {
            text: false,
            icons: {
              primary: this.options.icons.datepicker
            }
          } )
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return false;
            }
            event.preventDefault();
            $dp.datepicker( 'show' );
          } )
          .insertBefore( $div );
        return $div;
      }
    } );
  }
  if ( typeof $.fn.inputmask == 'function' ) {
    var base3 = {
      _createDateInput: $.hik.jtable.prototype._createDateInput
    };
    $.extend( true, $.hik.jtable.prototype, {
      _createDateInput: function( options, name, value ) {
        var $div = base3._createDateInput.apply( this, arguments );
        var inputmask = { 
          mask: options.options || this.options.defaultDateInputFormat, 
          placeholder: ' ', 
          clearIncomplete: true 
        };
        $div.find( ':input' ).inputmask( inputmask );
        return $div;
      }
    } );
  }
  if ( typeof $.fn.createValidation2 == 'function' ) {
    var base4 = {
      _remove: {
        makeFormSubmittable: $.hik.jtable.prototype._remove.makeFormSubmittable
      },
      _edit: {
        makeFormSubmittable: $.hik.jtable.prototype._edit.makeFormSubmittable
      },
      _create: {
        makeFormSubmittable: $.hik.jtable.prototype._create.makeFormSubmittable
      }
    };
    $.extend( true, $.hik.jtable.prototype, {
      _remove: {
        makeFormSubmittable: function( $form, $dialog, rows ) {
          $form
            .createValidation2( {
              submitHandler: function() {
                if ( this._trigger.call( this, 'formSubmitting', null, { form: $form, formType: 'delete', rows: rows } ) == false ) {
                  return;
                }
                this.deleteRows.call( this, rows, { 
                  success: function() {
                    $form.trigger( 'form.ajax.complete' );
                    $dialog.dialog( 'close' );
                  },
                  error: function( error ) {
                    $form.trigger( 'form.ajax.complete' );
                    $form.trigger( 'form.ajax.errors', [ { status: error } ] );
                  }
                } );
                return;
              }.bind( this ),
              errorPosition: 'bottom',
              buttons: {
                submit: {
                  icons: { primary: this.options.icons.remove  }
                }
              }
            } )
            .on( 'cancel', function() {
              $dialog.dialog( 'close' );
            } );
        }
      },
      _edit: {
        makeFormSubmittable: function( $form, $dialog, rows ) {
          $form
            .createValidation2( {
              submitHandler: function() {
                if ( this._trigger.call( this, 'formSubmitting', null, { form: $form, formType: 'edit', rows: rows } ) == false ) {
                  return;
                }
                var values = this._serializeObjects.call( this, $form.find( ':input' ), rows.length > 1 );
                //values = $form.serializeObject(),
                this.updateRows.call( this, rows, values, { 
                  success: function() {
                    $form.trigger( 'form.ajax.complete' );
                    $dialog.dialog( 'close' );
                  },
                  error: function( error ) {
                    $form.trigger( 'form.ajax.complete' );
                    $form.trigger( 'form.ajax.errors', [ { status: error } ] );
                  }
                } );
                return;
              }.bind( this ),
              errorPosition: 'bottom',
              buttons: {
                submit: {
                  icons: { primary: this.options.icons.save  }
                }
              }
            } )
            .on( 'cancel', function() {
              $dialog.dialog( 'close' );
            } );
        }
      },
      _create: {
        makeFormSubmittable: function( $form, $dialog ) {
          $form
            .createValidation2( {
              submitHandler: function() {
                if ( this._trigger.call( this, 'formSubmitting', null, { form: $form, formType: 'create' } ) == false ) {
                  return;
                }
                var values = this._serializeObjects.call( this, $form.find( ':input' ) );
                //values = $form.serializeObject(),
                this.addRecord.call( this, values, { 
                  success: function() {
                    $form.trigger( 'form.ajax.complete' );
                    $dialog.dialog( 'close' );
                  },
                  error: function( error ) {
                    $form.trigger( 'form.ajax.complete' );
                    $form.trigger( 'form.ajax.errors', [ { status: error } ] );
                  }
                } );
                return;
              }.bind( this ),
              errorPosition: 'bottom',
              buttons: {
                submit: {
                  icons: { primary: this.options.icons.save  }
                }
              }
            } )
            .on( 'cancel', function() {
              $dialog.dialog( 'close' );
            } );

        }
      }
    } );
  }
})(jQuery);
