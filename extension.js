// This extension was developed by :
// * Baptiste Saleil http://bsaleil.org/
// * Community : https://github.com/bsaleil/todolist-gnome-shell-extension/network
// With code from :https://github.com/vibou/vibou.gTile
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
const Utils = imports.misc.extensionUtils.getCurrentExtension().imports.utils;
const mySettings = Utils.getSettings();

const Gettext = imports.gettext;
const _ = Gettext.domain('todolist').gettext;

const MAX_LENGTH = 100;
const KEY_RETURN = 65293;
const KEY_ENTER = 65421;
const key_open = 'open-todolist';	// Schema key for key binding
const BASE_TASKS = "Do something\nDo something else\nDo more stuff\nDo that again\n";

let meta;	// Metadata
let todo;	// Todolist instance
let filePath;	// Tasks file path

// TasksManager function
function TasksManager(metadata)
{
	// File in home directory
	filePath = GLib.get_home_dir() + "/.list.tasks";

	let locales = metadata.path + "/locale";
	Gettext.bindtextdomain('todolist', locales);

	this._init();
}

// Prototype
TasksManager.prototype =
{
	__proto__: PanelMenu.Button.prototype,
	
    	_init: function() 
    	{
    		// Check if file exists and create it if not
		if (!GLib.file_test(filePath, GLib.FileTest.EXISTS))
			createBaseFile();	
    			
		PanelMenu.Button.prototype._init.call(this, St.Align.START);

		this.mainBox = null;
		this.buttonText = new St.Label({text:_("(...)")});
		this.buttonText.set_style("text-align:center;");
		this.actor.add_actor(this.buttonText);
		this.buttonText.get_parent().add_style_class_name("panelButtonWidth");
			
		// Add keybinding
		global.display.add_keybinding
		(
			key_open,
			mySettings,
			Meta.KeyBindingFlags.NONE,
			Lang.bind(this, function() { this.menu.open(); })
		);
		
		// Auto focus
		this.menu.connect('open-state-changed', Lang.bind(this, function(menu, open)
		{
			if (open) { this.newTask.grab_key_focus(); }
			else { this.newTask.get_stage().set_key_focus(null); }
		}));
			
		this._refresh();
	},
	
	_refresh: function()
	{    		
		let varFile = filePath;
		let tasksMenu = this.menu;
		let buttonText = this.buttonText;

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
		this.scrollView = new St.ScrollView({style_class: 'vfade',
                                          hscrollbar_policy: Gtk.PolicyType.NEVER,
                                          vscrollbar_policy: Gtk.PolicyType.AUTOMATIC});
		this.scrollView.add_actor(this.todosBox);
		this.mainBox.add_actor(this.scrollView);
		
    		// Sync
		if (GLib.file_test(filePath, GLib.FileTest.EXISTS))
		{
			let content = Shell.get_file_contents_utf8_sync(filePath);
			let lines = content.toString().split('\n');
			let tasks = 0;
			
			for (let i=0; i<lines.length; i++)
			{
				// if not empty
				if (lines[i] != '' && lines[i] != '\n')
				{
					let item = new PopupMenu.PopupMenuItem(_(lines[i]));
					let textClicked = lines[i];
					item.connect('activate', Lang.bind(this,function(){
						this.menu.close();
						buttonText.set_text(_("(...)"));
						removeTask(textClicked,varFile);
					}));
					this.todosBox.add(item.actor);
					
					tasks += 1;
				}
			}
			buttonText.set_text("(" + tasks + ")");
			if (tasks < 10) buttonText.get_parent().add_style_class_name("panelButtonWidth");
			else buttonText.get_parent().remove_style_class_name("panelButtonWidth");
		}
		else { createBaseFile(); }
		
		// Separator
		this.Separator = new PopupMenu.PopupSeparatorMenuItem();
		this.mainBox.add_actor(this.Separator.actor);
		
		// Bottom section
		let bottomSection = new PopupMenu.PopupMenuSection();
		
		this.newTask = new St.Entry(
		{
			name: "newTaskEntry",
			hint_text: _("New task..."),
			track_hover: true,
			can_focus: true
		});
		
		let entryNewTask = this.newTask.clutter_text;
		entryNewTask.set_max_length(MAX_LENGTH);
		entryNewTask.connect('key-press-event', function(o,e)
		{
			let symbol = e.get_key_symbol();
		    	if (symbol == KEY_RETURN || symbol == KEY_ENTER)
		    	{
				tasksMenu.close();
				buttonText.set_text(_("(...)"));
				addTask(o.get_text(),varFile);
		    		entryNewTask.set_text('');
			}
		});
		
		bottomSection.actor.add_actor(this.newTask);
		bottomSection.actor.add_style_class_name("newTaskSection");
		this.mainBox.add_actor(bottomSection.actor);
		tasksMenu.addActor(this.mainBox);
	},
	
	_enable: function()
	{			
		// Refresh menu
		let fileM = Gio.file_new_for_path(filePath);
		this.monitor = fileM.monitor(Gio.FileMonitorFlags.NONE, null);
		this.monitor.connect('changed', Lang.bind(this, this._refresh));
	},

	_disable: function()
	{
		global.display.remove_keybinding(key_open);
		this.monitor.cancel();
	}
}

// Create base file (base tasks list) TODO
function createBaseFile()
{
	GLib.file_set_contents(filePath,BASE_TASKS);
}

// Remove task "text" from file "file"
function removeTask(text,file)
{
	let newText = "";
	if (GLib.file_test(file, GLib.FileTest.EXISTS))
	{
		let content = Shell.get_file_contents_utf8_sync(file);
		let tasks = content.toString().split('\n');
		
		for (let i=0; i<tasks.length; i++)
		{
			// if not corresponding
			if (tasks[i] != text)
			{
				newText += "\n";
				newText += tasks[i];
			}
		}
		
		let f = Gio.file_new_for_path(file);
		let out = f.replace(null, false, Gio.FileCreateFlags.NONE, null);
		Shell.write_string_to_stream (out, newText);
		out.close(null);
	}
	else
	{ global.logError("Todo list : Error with file : " + filePath); }
}

// Add task "text" to file "file"
function addTask(text,file)
{
	if (GLib.file_test(file, GLib.FileTest.EXISTS))
	{
		let content = Shell.get_file_contents_utf8_sync(file);
		content = content + text + "\n";
		
		let f = Gio.file_new_for_path(file);
		let out = f.replace(null, false, Gio.FileCreateFlags.NONE, null);
		Shell.write_string_to_stream (out, content);
		out.close(null);
	}
	else
	{ global.logError("Todo list : Error with file : " + filePath); }
}

// Init function
function init(metadata) 
{		
	meta = metadata;
}

function enable()
{
	todo = new TasksManager(meta);
	todo._enable();
	Main.panel.addToStatusArea('todo', todo);
}

function disable()
{
	todo._disable();
	todo.destroy();
	todo = null;
}
