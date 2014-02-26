What is jBandedTable
======

jBandedTable is a successor of jTable 2.3.1.

Lots of code has been reworked since, but much more has been broken.

The most common purpose of this branch is to make a jTable:

* Banded (colspan and rowspan are controlled via js, planned to be cotnrolled via html too).
* Filtering and sorting setting are improved, though still only serverside.
* Copying of records
* Multi operations: multiple records can be deleted and edited via multiselect option.

======
http://www.jtable.org

jTable is a jQuery plugin that is used to create AJAX based CRUD tables without coding HTML or Javascript. It has several features including:

* Automatically creates HTML table and loads records from server using AJAX.
* Creates 'create new record' jQueryUI dialog form. When user creates a record, it sends data to server using AJAX and adds the same record to the table in the page.
* Creates 'edit record' jQueryUI dialog form. When user edits a record, it updates server using AJAX and updates all cells on the table in the page.
* Allow user to 'delete a record' by jQueryUI dialog based confirmation. When user deletes a record, it deletes the record from server using AJAX and deletes the record from the table in the page.
* Shows animations for create/delete/edit operations on the table.
* Supports server side paging using AJAX.
* Supports server side sorting using AJAX.
* Supports master/child tables.
* Allows user to select rows.
* Allows user to resize columns.
* Allows user to show/hide columns.
* Exposes some events to enable validation with forms.
* It can be localized easily.
* All styling of table and forms are defined in a CSS file, so you can easily change style of everything to use plugin in your pages. CSS file is well defined and commented.
* It comes with pre-defined color themes.
* It is not depended on any server side technology.
* It is platform independed and works on all common browsers.

Notes
======
See http://www.jtable.org for documantation, demos, themes and more...
