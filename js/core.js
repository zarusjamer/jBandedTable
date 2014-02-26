;$( document ).ready( function() {
  
  $.fn.createTabs = function( options ) {
    var
      $menu = $( this ),
      settings = $.extend( true, {
        closable: false,
        autoformat: false,
        vertical: false,
        holder: '<div/>',
        classTabs: 'headers',
        classContent: 'content'
      }, options );
    
    
    if ( settings.autoformat ) {
      var
        $parent = $menu.parent(),
        $tabs = $( settings.holder )
          .addClass( settings.classTabs + ' clearfix' ),
        $content = $( settings.holder )
          .addClass( settings.classContent );
      if ( settings.vertical ) {
        $content.addClass( 'autowidth' );
      } else {
        $content.addClass( 'autoheight' );
      }
      $tabs.append( $menu );
      $parent
        .find( '[id]' )
          .addClass( 'hidden autowidth autoheight' )
          .appendTo( $content );
      
      $parent
        .append( $tabs )
        .append( $content );
    }
    
    if ( settings.vertical ) {
      
    } else {
      $menu.addClass( 'sf-menu' );
    }
    
    $menu
      .superfish( {
        speed: 'fast'
      } )
      .off( 'click.tabs' )
      .on( 'click.tabs', 'li', function( event ) {
        if ( event.button != 0 ) {
          return;
        }
        event.preventDefault();
        var 
          $this = $( event.currentTarget ),
          $a = $this.find( 'a' ),
          id = $a.attr( 'href' ),
          $div = $( id );
        
        if ( $div.length == 0 ) {
          return;
        }
         
        $menu.find( 'li' ).removeClass( 'current' );
        $this.addClass( 'current' );
        $div.siblings( '[id]' ).addClass( 'hidden' );
        $div.removeClass( 'hidden' );
        $( window ).trigger( 'resize' );
      } );
    if ( settings.closable ) {
      $menu
        .on( 'click.tabs', '.clickable.close', function( event ) {
          if ( event.button != 0 ) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          var 
            $target = $( event.target ),
            href= $target.parent().attr( 'href' ),
            id = href.substring( href.indexOf( '#' ) ),
            $li = $target.closest( 'li' ),
            $prev = $li.prev();
          
          $( id ).remove();
          $li.remove();
          $prev
            .trigger( {
              type: 'click',
              button: 0
            } );
        } );
    }
    $menu
      .find( '> li:first' )
        .trigger( {
          type: 'click',
          button: 0
        } );
  };
  
  $.fn.createDatepicker = function( options ) {
  
    var settings = $.extend( true, {
      title: 'Выбрать дату',
      format: 'dd.mm.yyyy',
      yearRange: "-100:+0",
      language: 'ru',
      autoClose: true,
      inputmask: { mask: '99.99.9999', placeholder: ' ', clearIncomplete: true }
    }, options );

    var 
      $element = $( this ),
      $div = $element.parent(),
      $prev = $div.prev(),
      $dp = $element.inputmask( settings.inputmask ).datepicker( settings );

    if ( !$prev.hasClass( 'ui-datepicker-trigger' ) ) {
      $prev = 
        $( '<span class="ui-datepicker-trigger">' + settings.title + '</span>' )
          .insertBefore( $div );
    }
    $prev
      .button( {
        text: false,
        icons: {
          primary: 'ui-icon-calendar'
        }
      } )
      .off( 'click.datepicker' )
      .on( 'click.datepicker', function( event ) {
        if ( event.button != 0 ) {
          return false;
        }
        event.preventDefault();
        event.stopPropagation();
        $dp.datepicker( 'show' );
      } );
  };
  
  $.fn.createAjaxForm = function( options, validator ) {
    var 
      $form = $( this ),
      $submit = null,
      buttons = {
        submit: {
          selector: ':input[type=submit],.submit',
          icons: {
            primary: 'ui-icon-check'
          }
        },
        reset: {
          selector: ':input[type=reset],.reset',
          icons: {
            primary: 'ui-icon-trash'
          }
        },
        close: {
          selector: '.close',
          //icons: {
          //  primary: 'ui-icon-delete'
          //}
        }
      };

    if ( options && options.buttons ) {
      $.extend( true, buttons, options.buttons );
    }
    $.each( buttons, function( key, opts ) {
      $button = $form
        .find( opts.selector )
        .button( opts );
      if ( key == 'submit' ) {
        $submit = 
          $button
            .on( 'click', function( event ) {
              if ( event.button != 0 ) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              $form.trigger( 'submit' );
            } );
      } else if ( key == 'reset' ) {
        $button
          .on( 'click', function( event ) {
            if ( event.button != 0 ) {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            $form.trigger( 'reset' );
            $form.find( ':input' ).trigger( 'change' );
          } );
      } else if ( key == 'close' ) {
        $button
        .on( 'click', function( event ) {
          if ( event.button != 0 ) {
            return;
          }
          $form.trigger( 'cancel' );
        } );
    }
      if ( typeof( opts.events ) !== 'undefined' ) {
        $.each( opts.events, function( event, callback ) {
          if ( event && typeof( callback ) == 'function' ) {
            $button.on( event, callback );
          } 
        } );
      }
    } );

    if ( $submit && $submit.length > 0 ) {
      var icons = null;
      $form.on( 'form.ajax.started', function( event ) {
        icons = $submit.button( 'option', 'icons' ),
        $submit
        	.addClass( 'ui-state-disabled' )
        	.button( 'option', 'icons', { primary: 'ui-icon-loading' } );
      } );
      $form.on( 'form.ajax.complete', function( event ) {
        $submit
        	.button( 'option', 'icons', icons )
        	.removeClass( 'ui-state-disabled' );
      } );
    }
    $form.on( 'form.ajax.errors', function( event, errors ) {
      if ( validator && errors ) {
        validator.showErrors( errors );
      }
    } );
    $form.on( 'form.ajax.validate', function( event, results, callback ) {
      if ( !results ) {
        return;
      }
      var
        hasErrors = false,
        errors = {};
      if ( $.isXMLDoc( results ) ) {
        $( results ).find( 'error' ).each( function() {
          hasErrors = true;
          var 
            error = $( this ),
            key = error.attr( 'data-id' ),
            msg = error.find( 'message' ).text();
          errors[key] = msg;
        } );
      } else if ( results && results.errors ) {
        hasErrors = true;  
        var 
          list = results.errors.error;
        for ( var i = 0, max = list.length; i < max; i++ ) {
          var error = results.errors.error[i];
          errors[error.data] = error.message;
        }
      }
      if ( hasErrors ) {
        $form.trigger( 'form.ajax.errors', [ errors ] );
      } else {
        $form.trigger( 'form.ajax.success', [ results ] );
        if ( typeof callback == 'function' ) {
          callback.apply( $form, [ results ] );
        }
      }
    } );
  };
    
  $.fn.createValidation2 = function( options ) {
    if ( !$.fn.validate ) {
      return;
    }
    var 
      $form = $( this ),
      validator = this.data( 'validator' );

    if ( !validator ) {
      var settings = $.extend( true, {
        ignore: '',
        focusInvalid: true,
        clearFocus: true,
        wrapper: '',
        errorElement: 'div',
        errorClass: 'error'
      }, options );
      if ( typeof settings.submitHandler == 'function' ) {
        settings.submitHandler = function( form, e ) {
          $( form ).trigger( 'form.ajax.started' );
          options.submitHandler.apply( this, [ form, e ] );
        };
      }
      validator = this.validate( settings );
      if ( $form.is( 'form' ) ) {
        this.createAjaxForm( options, validator );
      }
    }
    
    $form.find( ":input" ).each( function() {
      var 
        $element = $( this ),
        name = $element.attr( 'name' ) || $element.attr( 'id' ),
        skip = $element.attr( 'skip' ),
        type = $element.attr( 'edit' ),
        title = $element.attr( 'title' ),
        rules = { messages: {} };
      $element.rules( 'remove' );
      
      if ( skip ) {
        return;
      }
      
      if ( $element.is( 'select' ) && $.fn.select2 != undefined && !$element.hasClass( 'select2-offscreen' ) ) {
        $element
          .select2( {
            allowClear: true,
            dropdownAutoWidth: false,
            minimumResultsForSearch: 10
          } );
      }

      var group = $element.attr( 'group' );
      if ( group ) {
        var sel = "[group='" + group + "']";
        if ( $form.find( ':input' + sel ).length > 1 ) {
          rules.require_from_group = [ 1, sel ];
        } else {
          $element.removeAttr( 'group' );
          $element.attr( 'required', 'required' );
        }
      }
      if ( $element.attr( 'required' ) == 'required' ) {
        rules.required = true;
        if  ( type == 'bit' ) {
          rules.messages.required = title || 'Отметьте';
        }
      } else {
        rules.required = false;
      }
      var minl = $element.attr( 'minlength' );
      if ( minl > 0 ) {
        rules.minlength = minl;
      }
      var maxl = $element.attr( 'maxlength' );
      if ( maxl > 0 ) {
        rules.maxlength = maxl;
      }
      var minv = $element.attr( 'min' );
      if ( minv > 0 ) {
        rules.min = minv;
      }
      var maxv = $element.attr( 'max' );
      if ( maxv > 0 ) {
        rules.max = maxv;
      }
      var eq = $element.attr( 'equalTo' );
      if ( eq ) {
        rules.equalTo = ":input[name='" + eq + "']";
      }
      switch( type ) {
        case 'year':
          var opts = { 
            format: 'yyyy',
            viewMode: 'years', 
            minViewMode: 'years',
            inputmask: { mask: '9999', placeholder: 'ГГГГ' }
          };
          if ( maxv ) {
            opts.maxDate = maxv;
          }
          if ( minv ) {
            opts.minDate = minv;
          }
          $element.createDatepicker( opts );
          break;
        case 'dateISO':
          rules.validDateISO = true;
          rules.messages.validDateISO = title || 'Введите правильную дату в формате ГГГГ-ММ-ДД';
          var opts = { 
            format: 'yyyy-mm-dd',
            inputmask: { mask: '9999-99-99', placeholder: 'ГГГГ-ММ-ДД' }
          };
          if ( maxv ) {
            opts.maxDate = maxv;
          }
          if ( minv ) {
            opts.minDate = minv;
          }
          $element.createDatepicker( opts );
          break;
        case 'date':
          rules.validDate = true;
          rules.messages.validDate = title || 'Введите правильную дату в формате ДД.ММ.ГГГГ';
          var opts = { 
            format: 'dd.mm.yyyy',
            inputmask: { mask: '99.99.9999', placeholder: 'ДД.ММ.ГГГГ' }
          };
          if ( maxv ) {
            opts.maxDate = maxv;
          }
          if ( minv ) {
            opts.minDate = minv;
          }
          $element.createDatepicker( opts );
          break;
        case 'datetimeISO':
          rules.validDateISO = true;
          rules.messages.validDateISO = title || 'Формат: ГГГГ-ММ-ДДTЧЧ:ММ';
          $element
            .inputmask( { mask: "9999-99-99T99:99", placeholder: "ГГГГ-ММ-ДДTЧЧ:ММ", clearIncomplete: true } );
          break;
        case 'datetime':
          rules.validDate = true;
          rules.messages.validDate = title || 'Формат: ГГГГ-ММ-ДД ЧЧ:ММ:СС';
          $element
            .inputmask( { mask: "9999-99-99 99:99:99", placeholder: "ГГГГ-ММ-ДД ММ:ЧЧ:СС", clearIncomplete: true } );
          break;
        case 'integer':
          rules.digits = true;
          break;
        case 'money':
          rules.money = true;
          $element
            .inputmask( "decimal", {
              onUnMask: function( maskedValue, unmaskedValue ) {
                return unmaskedValue.split( ' ' ).join( '' );
              },
              rightAlignNumerics: false,
              radixPoint: ".",
              autoGroup: true, 
              groupSeparator: " ",
              groupSize: 3,
              autoUnmask: true
            } );
          break;
        case 'email':
          rules.email = true;
          break;
        case 'checkbox':
          var setValue = function( $image, $input, value ) {
            if ( value == 'true' || value == '1' ) {
              if ( $image ) {
                $image.attr( 'isChecked', '1' );
              }
              if ( $input ) {
                $input.attr( 'value', '1' );
              }
            } else {
              if ( $image ) {
                $image.attr( 'isChecked', '0' );
              }
              if ( $input ) {
                $input.removeAttr( 'value' );
              }
            }
          };
          var 
            value = $element.attr( 'value' ),
            $checker = $( '<i></i>' );
          $element.addClass( 'hidden' );
          $element.removeClass( 'inline' );
          $checker.insertBefore( $element );
          $checker.attr( 'role', 'checkbox' );
          $checker.attr( 'name', name );
          setValue( $checker, $element, value );
          $checker.on( 'click', function( e ) {
            var 
              $this = $( e.target ),
              isChecked = $this.attr( 'isChecked' );
            if ( isChecked == '1' ) {
              setValue( $this, $element, 'false' );
            } else {
              setValue( $checker, $element, 'true' );
            }
            $form.validate().form();
          } );
          break;
        default:
          break;
      }
      for( var rule in rules ) {
        if ( rules.messages[rule] == undefined ) {
          rules.messages[rule] = $.validator.messages[rule];
        }
      }
      $element.rules( 'add', rules );
    } );
    return this;
  };
  
  if ( typeof String.prototype.removeWhitespaces !== 'function' ) {
    String.prototype.removeWhitespaces = function() {
      return this.replace( /^\s+|\s+$/, '' ).replace( /\s+/gi, ' ' );
    };
  }

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
  
  //if ( typeof String.prototype.repeat !== 'function' ) {
    String.prototype.repeat = function( count ) {
      if ( isNaN( count ) || count <= 0 ) {
        return '';
      }
      return new Array( ++count ).join( this );
    };
  //}
  if ( typeof String.prototype.insertAtIndex !== 'function' ) {
    String.prototype.insertAtIndex = function ( string, index ) {
      if ( string == '' ) {
        return this;
      }
      if ( index == 0 || index < -this.length ) {
        return string + this;
      }
      if ( index >= this.length ) {
        return this + string;
      }
      var pos = index;
      if ( pos < 0 ) {
        pos = this.length + pos;
      }
      return this.substring( 0, pos ) + string + this.substring( pos, this.length );
    };
  }
  if ( typeof String.prototype.formatXML !== 'function' ) { 
    String.prototype.formatXML = function() {
      var output = '';
      var prevInfo = null;
      indent = 0;
      var match = null;
      var rx = /<(\/)?([^ ]+?)(?: [^>]+?)?(\/)?>([^<]+)?/g;
      while ( match = rx.exec( this ) ) {
        var info = {
          isClosing: !!match[1],
          isClosed: !!match[3],
          isText: !!match[4],
          name: match[2]
        };
        info.isOpening = !info.isClosing && !info.isClosed;
        if ( prevInfo ) {
          if ( prevInfo.name == info.name && info.isClosing && !prevInfo.isClosed && !prevInfo.isText ) {
            output = output.insertAtIndex( '/', -1 );
            info.isClosed = true;
            prevInfo = info;
            indent--;
            continue;
          }
          if ( !( info.isClosing && prevInfo.isText ) ) { 
            output += '\r\n';
            if ( info.isOpening ) {
              output += '  '.repeat( ++indent );
            } else {
              output += '  '.repeat( indent-- );
            } 
          } else {
            indent--;
          }
          output += match[0];
        } else { 
          output += match[0];
        }
        prevInfo = info;
      }
      return output;
    };
  }

  if ( typeof $.fn.outerHTML !== 'function' ) {
    $.fn.outerHTML = function() {
      var that = $( this );
      if ( that.length == 0 ) {
        return '';
      }
      that = that[0];
      if ( 'outerHTML' in that ) {
        return that.outerHTML;
      }
      var 
        wrap = that.clone().wrap( '<div></div>' ).parent();
        result = wrap.html();
      wrap.remove();
      return result;
    };
  }
  
  if ( typeof $.fn.autoWidth !== 'function' ) {
    $.fn.autoWidth = function( options ) { 
      var settings = $.extend( { 
        limitWidth: false 
      }, options );
      var maxWidth = 0; 
      this.each( function() { 
        if ( $( this ).width() > maxWidth ) { 
          if(  settings.limitWidth && maxWidth >= settings.limitWidth ) { 
            maxWidth = settings.limitWidth; 
          } else { 
            maxWidth = $( this ).width(); 
          } 
        } 
      } );   
      this.width( maxWidth ); 
    };
  }
  
  if ( typeof String.prototype.serializeInputName != 'function' ) {
    String.prototype.serializeInputName = function( value ) {
      var names = this.split( /(\w+|\[\w+\])/ );
      if ( names.length == 0 ) {
        return {};
      }
      //var names = this.replace(/^\w+/, "$&]").replace(/]$/, "").split("][");
      var 
        output = {},
        obj = output,
        last = null;
      for ( var i = 0; i < names.length; i++ ) {
        var name = names[i];
        if ( i > 0 ) {
          obj = obj[last] = ( name === "" ? [] : {} );
        }
        last = name === "" ? 0 : name;
      }
      if ( typeof last !== "undefined") {
        obj[last] = value;
      }
      return output;
    };
  }
  
  if ( typeof $.fn.serializeObject !== 'function' ) {
    $.fn.serializeObject = function( excludeEmpty ) {
      var json, patterns, push_counters, _this = this;
      json = {};
      push_counters = {};
      patterns = {
        validate: /^(?:\[(?:\d*|[a-zA-Z0-9_]+)\]|(?:\d*|[a-zA-Z0-9_]+))+$/,
        key: /[a-zA-Z0-9_]+|(?=\[\])/g,
        push: /^$/,
        fixed: /^\d+$/,
        named: /^[a-zA-Z0-9_]+$/
      };
      this.build = function( base, key, value ) {
        base[key] = value;
        return base;
      };
      this.push_counter = function(key) {
        if ( push_counters[key] === void 0 ) {
          push_counters[key] = 0;
        }
        return push_counters[key]++;
      };
      $.each( $( this ).find( ':input[name]'), function() {
        var 
          $this = $( this ),
          elem = { 
            value: $this.val(), 
            name: $this.attr( 'name' ) 
          };
        if ( excludeEmpty && elem.value == '' ) {
          return;
        } 
        var k, keys, merge, re, reverse_key;
        if ( !patterns.validate.test( elem.name ) ) {
          return;
        }
        keys = elem.name.match( patterns.key );
        merge = elem.value;
        reverse_key = elem.name;
        while ( ( k = keys.pop() ) !== void 0 ) {
          if ( patterns.push.test( k ) ) {
            re = new RegExp( "\\[" + k + "\\]$" );
            reverse_key = reverse_key.replace( re, '' );
            merge = _this.build([], _this.push_counter( reverse_key ), merge);
          } else if ( patterns.fixed.test( k ) ) {
            merge = _this.build( [], k, merge );
          } else if ( patterns.named.test( k ) ) {
            merge = _this.build( {}, k, merge );
          }
        }
        return json = $.extend( true, json, merge );
      } );
      /*
      $.each( $( this ).serializeArray(), function( i, elem ) {
        var k, keys, merge, re, reverse_key;
        if ( !patterns.validate.test( elem.name ) ) {
          return;
        }
        keys = elem.name.match( patterns.key );
        merge = elem.value;
        reverse_key = elem.name;
        while ( ( k = keys.pop() ) !== void 0 ) {
          if ( patterns.push.test( k ) ) {
            re = new RegExp( "\\[" + k + "\\]$" );
            reverse_key = reverse_key.replace( re, '' );
            merge = _this.build([], _this.push_counter( reverse_key ), merge);
          } else if ( patterns.fixed.test( k ) ) {
            merge = _this.build( [], k, merge );
          } else if ( patterns.named.test( k ) ) {
            merge = _this.build( {}, k, merge );
          }
        }
        return json = $.extend( true, json, merge );
      } );
      */
      return json;
    };
  }
  


  if ( !( 'bind' in Function.prototype ) ) {
    Function.prototype.bind = function( oThis ) {
      if ( typeof this !== "function" ) {
        // closest thing possible to the ECMAScript 5 internal IsCallable function
        throw new TypeError( "Function.prototype.bind - what is trying to be bound is not callable" );
      }
      var aArgs = Array.prototype.slice.call(arguments, 1), 
      fToBind = this, 
      fNOP = function() {},
      fBound = function() {
        return fToBind.apply( this instanceof fNOP && oThis
                               ? this
                               : oThis,
                             aArgs.concat( Array.prototype.slice.call( arguments ) ) );
      };
      fNOP.prototype = this.prototype;
      fBound.prototype = new fNOP();
      return fBound;
    };
  }
  
  // Add ECMA262-5 string trim if not supported natively
  if ( !( 'trim' in String.prototype ) ) {
    String.prototype.trim = function() {
      return this.replace( /^\s+/, '' ).replace( /\s+$/, '' );
    };
  }
  
  // Add ECMA262-5 Array methods if not supported natively
  if ( !( 'indexOf' in Array.prototype ) ) {
    Array.prototype.indexOf = function( find, i /* opt */) {
      if ( i === undefined )
        i = 0;
      if ( i < 0 )
        i += this.length;
      if ( i < 0 )
        i = 0;
      for ( var n = this.length; i < n; i++ )
        if ( i in this && this[i] === find )
          return i;
      return -1;
    };
  }
  if ( !( 'lastIndexOf' in Array.prototype ) ) {
    Array.prototype.lastIndexOf = function( find, i /* opt */) {
      if ( i === undefined )
        i = this.length - 1;
      if ( i < 0 )
        i += this.length;
      if ( i > this.length - 1 )
        i = this.length - 1;
      for ( i++; i-- > 0; )
        /* i++ because from-argument is sadly inclusive */
        if ( i in this && this[i] === find )
          return i;
      return -1;
    };
  }
  if ( !( 'forEach' in Array.prototype ) ) {
    Array.prototype.forEach = function( action, that /* opt */) {
      for ( var i = 0, n = this.length; i < n; i++ )
        if ( i in this )
          action.call( that, this[i], i, this );
    };
  }
  if ( !( 'map' in Array.prototype ) ) {
    Array.prototype.map = function( mapper, that /* opt */) {
      var other = new Array( this.length );
      for ( var i = 0, n = this.length; i < n; i++ )
        if ( i in this )
          other[i] = mapper.call( that, this[i], i, this );
      return other;
    };
  }
  if ( !( 'filter' in Array.prototype ) ) {
    Array.prototype.filter = function( filter, that /* opt */) {
      var other = [], v;
      for ( var i = 0, n = this.length; i < n; i++ )
        if ( i in this && filter.call( that, v = this[i], i, this ) )
          other.push( v );
      return other;
    };
  }
  if ( !( 'every' in Array.prototype ) ) {
    Array.prototype.every = function( tester, that /* opt */) {
      for ( var i = 0, n = this.length; i < n; i++ )
        if ( i in this && !tester.call( that, this[i], i, this ) )
          return false;
      return true;
    };
  }
  if ( !( 'some' in Array.prototype ) ) {
    Array.prototype.some = function( tester, that /*opt*/) {
      for ( var i = 0, n = this.length; i < n; i++ )
        if ( i in this && tester.call( that, this[i], i, this ) )
          return true;
      return false;
    };
  }

} );
