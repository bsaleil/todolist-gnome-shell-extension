// Authors:
// * Baptiste Saleil http://bsaleil.org/
// * Community: https://github.com/bsaleil/todolist-gnome-shell-extension/network
// With code from: https://github.com/vibou/vibou.gTile
//
// Licence: GPLv2+

const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;

const Gettext = imports.gettext;
const _ = Gettext.domain('todolist').gettext;

const Utils = imports.misc.extensionUtils.getCurrentExtension().imports.utils;
const ExtensionSettings = Utils.getSettings(); // Get settings from utils.js

const MAX_LENGTH = 100;
const KEY_RETURN = 65293;
const KEY_ENTER  = 65421;
const BASE_TASKS = "Do something\nDo something else\nDo more stuff\nDo that again\n";

let todolist;	// Todolist instance
let meta;

//----------------------------------------------------------------------

// TodoList object
function TodoList(metadata)
{
	this.meta = metadata;
	this._init();
}

TodoList.prototype.__proto__ = PanelMenu.Button.prototype;

//----------------------------------------------------------------------
// TodoList methods

// Init
TodoList.prototype._init = function(){

	// Tasks file
	this.filePath = GLib.get_home_dir() + "/.list.tasks";
	
	// Locale
	let locales = this.meta.path + "/locale";
	Gettext.bindtextdomain('todolist', locales);

	// Button ui
	PanelMenu.Button.prototype._init.call(this, St.Align.START);
	this.mainBox = null;
	this.buttonText = new St.Label({text:_("(...)"), y_align: Clutter.ActorAlign.CENTER});
	this.buttonText.set_style("text-align:center;");
	this.actor.add_actor(this.buttonText);

	this._buildUI();
    this._refresh();
}

// Build popup ui
TodoList.prototype._buildUI = function(){
	// Destroy previous box    		
	if (this.mainBox != null)
		this.mainBox.destroy();

	// Create main box
	this.mainBox = new St.BoxLayout();
	this.mainBox.set_vertical(true);

	// Create todos box
	this.todosBox = new St.BoxLayout();
	this.todosBox.set_vertical(true);

	// Create todos scrollview
	var scrollView = new St.ScrollView({style_class: 'vfade',
		hscrollbar_policy: Gtk.PolicyType.NEVER,
		vscrollbar_policy: Gtk.PolicyType.AUTOMATIC});
	scrollView.add_actor(this.todosBox);
	this.mainBox.add_actor(scrollView);

	// Separator
	var separator = new PopupMenu.PopupSeparatorMenuItem();
	this.mainBox.add_actor(separator.actor);

	// Text entry
	this.newTask = new St.Entry(
	{
		name: "newTaskEntry",
		hint_text: _("New task..."),
		track_hover: true,
		can_focus: true
	});

	let entryNewTask = this.newTask.clutter_text;
	entryNewTask.set_max_length(MAX_LENGTH);
	entryNewTask.connect('key-press-event', Lang.bind(this,function(o,e)
	{
		let symbol = e.get_key_symbol();
		if (symbol == KEY_RETURN || symbol == KEY_ENTER)
		{
			this.menu.close();
			this.buttonText.set_text(_("(...)"));
			addTask(o.get_text(),this.filePath);
			entryNewTask.set_text('');
		}
	}));

	// Bottom section
	var bottomSection = new PopupMenu.PopupMenuSection();
	bottomSection.actor.add_actor(this.newTask);
	bottomSection.actor.add_style_class_name("newTaskSection");
	this.mainBox.add_actor(bottomSection.actor);
	this.menu.box.add(this.mainBox);
}

// Rebuild UI and read/display tasks
TodoList.prototype._refresh = function(){
	
	// Check if tasks file exists
	checkFile(this.filePath);

	// Add all tasks to ui
	this.todosBox.destroy_all_children();
	let content = Shell.get_file_contents_utf8_sync(this.filePath);
	let lines = content.toString().split('\n');
	let tasks = 0;
	for (let i=0; i<lines.length; i++)
	{
		if (lines[i] != '' && lines[i] != '\n')
		{
			let item = new PopupMenu.PopupMenuItem(_(lines[i]));
			let textClicked = lines[i];
			item.connect('activate', Lang.bind(this,function(){
				this.menu.close();
				this.buttonText.set_text(_("(...)"));
				removeTask(textClicked,this.filePath);
			}));
			this.todosBox.add(item.actor);
			tasks += 1;
		}
	}

	// Update status button
	this.buttonText.set_text("(" + tasks + ")");

	// Restore hint text
	this.newTask.hint_text = _("New task...");

}

// Enable method
TodoList.prototype._enable = function() {
	// Conect file 'changed' signal to _refresh
	let fileM = Gio.file_new_for_path(this.filePath);
	this.monitor = fileM.monitor(Gio.FileMonitorFlags.NONE, null);
	this.monitor.connect('changed', Lang.bind(this, this._refresh));

	// Key binding
	Main.wm.addKeybinding('open-todolist',
		                  ExtensionSettings,
		                  Meta.KeyBindingFlags.NONE,
		                  Shell.KeyBindingMode.ALL,
			              Lang.bind(this, signalKeyOpen));
}

// Disable method
TodoList.prototype._disable = function() {
	// Stop monitoring file
	this.monitor.cancel();
}

//----------------------------------------------------------------------
// Utils

// Called when 'open-todolist' is emitted (binded with Lang.bind)
function signalKeyOpen(){
	if (this.menu.isOpen)
		this.menu.close();
	else
	{
		this.menu.open();
		this.newTask.grab_key_focus();
	}
}

// Check if file exists. Create it if not
function checkFile(file){
	if (!GLib.file_test(file, GLib.FileTest.EXISTS))
		GLib.file_set_contents(filePath,BASE_TASKS);
}

// Remove task 'text' from file 'file'
function removeTask(text,file){
	
	// Check if file exists
	if (!GLib.file_test(file, GLib.FileTest.EXISTS))
	{
		global.logError("Todo list : Error with file : " + file);
		return;
	}

	// Create new text to write
	let content = Shell.get_file_contents_utf8_sync(file);
	let tasks = content.toString().split('\n');
	let newText = "";
	for (let i=0; i<tasks.length; i++)
	{
		// Add task to new text if not empty and not removed task
		if (tasks[i] != text && tasks[i] != '' && tasks[i] != '\n')
		{
			newText += tasks[i];
			newText += "\n";
		}
	}
	
	// Write new text to file
	let f = Gio.file_new_for_path(file);
	let out = f.replace(null, false, Gio.FileCreateFlags.NONE, null);
	Shell.write_string_to_stream (out, newText);
	out.close(null);
}

// Add task 'text' to file 'file'
function addTask(text,file)
{
	// Don't add empty task
	if (text == '' || text == '\n')
		return;

	// Check if file exists
	if (!GLib.file_test(file, GLib.FileTest.EXISTS))
	{
		global.logError("Todo list : Error with file : " + file);
		return;
	}

	// Append to content
	let content = Shell.get_file_contents_utf8_sync(file);
	content = content + text + "\n";
	
	// Write new text to file
	let f = Gio.file_new_for_path(file);
	let out = f.replace(null, false, Gio.FileCreateFlags.NONE, null);
	Shell.write_string_to_stream (out, content);
	out.close(null);
}

//----------------------------------------------------------------------
// Shell entry points

// Init function
function init(metadata) 
{		
	meta = metadata;
}

function enable()
{
	todolist = new TodoList(meta);
	todolist._enable();
	Main.panel.addToStatusArea('todolist', todolist);
}

function disable()
{
	todolist._disable();
	todolist.destroy();
	todolist = null;
}

//----------------------------------------------------------------------