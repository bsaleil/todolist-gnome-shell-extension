// This extension was developed by :
// * Baptiste Saleil http://bsaleil.org/
// * Arnaud Bonatti https://github.com/Obsidien
//
// Licence: GPLv2+

const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;

const Gettext = imports.gettext;
const _ = Gettext.domain('todolist').gettext;

// TasksManager function
function TasksManager(metadata)
{	
	this.file = metadata.path + "/list.tasks";

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
		PanelMenu.Button.prototype._init.call(this, St.Align.START);

		this.buttonText = new St.Label({text:_("(...)")});
		this.buttonText.set_style("text-align:center;");
		this.actor.add_actor(this.buttonText);
		this.buttonText.get_parent().add_style_class_name("panelButtonWidth");
			
		this._refresh();
	},
	
	_refresh: function()
	{    		
		let varFile = this.file;
		let tasksMenu = this.menu;
		let buttonText = this.buttonText;

    		// Clear
    		tasksMenu.removeAll();
		
    		// Sync
		if (GLib.file_test(this.file, GLib.FileTest.EXISTS))
		{
			let content = Shell.get_file_contents_utf8_sync(this.file);
			
			let lines = content.toString().split('\n');
			let tasks = 0;
			
			for (let i=0; i<lines.length; i++)
			{
				// if not a comment && not empty
				if (lines[i][0] != '#' && lines[i] != '' && lines[i] != '\n')
				{
					let item = new PopupMenu.PopupMenuItem(_(lines[i]));
					let textClicked = lines[i];
					item.connect('activate', function(){
						buttonText.set_text(_("(...)"));
						removeTask(textClicked,varFile);
					});
					tasksMenu.addMenuItem(item);
					
					tasks += 1;
				}
			}
			buttonText.set_text("(" + tasks + ")");
			if (tasks < 10) buttonText.get_parent().add_style_class_name("panelButtonWidth");
			else buttonText.get_parent().remove_style_class_name("panelButtonWidth");
		}
		else { global.logError("Todo list : Error while reading file : " + varFile); }
		
		// Separator
		this.Separator = new PopupMenu.PopupSeparatorMenuItem();
		tasksMenu.addMenuItem(this.Separator);
		
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
		entryNewTask.connect('key-press-event', function(o,e)
		{
			let symbol = e.get_key_symbol();
		    	if (symbol == Clutter.Return)
		    	{
				tasksMenu.close();
				buttonText.set_text(_("(...)"));
				addTask(o.get_text(),varFile);
		    		entryNewTask.set_text('');
			}
		});
		
		bottomSection.actor.add_actor(this.newTask);
		bottomSection.actor.add_style_class_name("newTaskSection");
		tasksMenu.addMenuItem(bottomSection);
		/* tasksMenu.connect('open-state-changed', Lang.bind(this, function(menu, isOpen) {
			if (isOpen) {this.newTask.grab_key_focus();}
		}));*/ 
	},
	
	enable: function()
	{
		// Main.panel.addToStatusArea('tasks', this);  // how to destroy that correctly?
		Main.panel._rightBox.insert_child_at_index(this.actor, 0);
		Main.panel._menus.addMenu(this.menu);
		
		// Refresh menu
		let fileM = Gio.file_new_for_path(this.file);
		this.monitor = fileM.monitor(Gio.FileMonitorFlags.NONE, null);
		this.monitor.connect('changed', Lang.bind(this, this._refresh));
	},

	disable: function()
	{
		Main.panel._menus.removeMenu(this.menu);
		// Main.panel._statusArea['tasks'].destroy();
		Main.panel._rightBox.remove_actor(this.actor);
		this.monitor.cancel();
	}
}

// Remove task "text" from file "file"
function removeTask(text,file)
{
	if (GLib.file_test(file, GLib.FileTest.EXISTS))
	{
		let content = Shell.get_file_contents_utf8_sync(file);
		let tasks = content.toString().split('\n');
		let newText = "#tasks";
		
		for (let i=0; i<tasks.length; i++)
		{
			// if not corresponding
			if (tasks[i] != text)
			{
				if(tasks[i][0] != '#')
				{
					newText += "\n";
					newText += tasks[i];
				}
			}
		}
		let f = Gio.file_new_for_path(file);
		let out = f.replace(null, false, Gio.FileCreateFlags.NONE, null);
		Shell.write_string_to_stream (out, newText);
	}
	else 
	{ global.logError("Todo list : Error while reading file : " + file); }
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
	}
	else 
	{ global.logError("Todo list : Error while reading file : " + file); }
}

// Init function
function init(metadata) 
{		
	return new TasksManager(metadata);
}
