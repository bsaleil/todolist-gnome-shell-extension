// This extension was developed by Baptiste Saleil
// Contact me if you have any problem, bug,...
// http://bsaleil.org/
// 
// Licence: GPLv2+

const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;
const Main = imports.ui.main;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;

// TasksManager function
function TasksManager(metadata)
{	
	this.file = metadata.path;
	this.file += "/";
	this.file += metadata.configFile;
	
	this._init(metadata);
}

// Prototype
TasksManager.prototype =
{
	__proto__: PanelMenu.Button.prototype,
    	_init: function(metadata) 
    	{	
		PanelMenu.Button.prototype._init.call(this, St.Align.START);
		this.buttonText = new St.Label({});
		this.buttonText.set_text("Todo");
		this.actor.add_actor(this.buttonText);
		this._test();
		
    	},
    	
    	_test: function()
    	{    	
    		// Clear all
    		this.menu.removeAll();
    		// Head section
	      	let headSection = new PopupMenu.PopupMenuSection();
	      	// Title
		this.label = new St.Label({ text: 'Tasks :', style_class: 'label'});
		headSection.actor.add_actor(this.label);
		// Separator
		this.labelSeparator = new PopupMenu.PopupSeparatorMenuItem();
		headSection.addMenuItem(this.labelSeparator);
		this.menu.addMenuItem(headSection);
		
		
		// Tasks
		let varFile = this.file;
		if (GLib.file_test(this.file, GLib.FileTest.EXISTS))
		{
			let content = Shell.get_file_contents_utf8_sync(this.file);
			
			let tasks = content.toString().split('\n');
			for (let i=0; i<tasks.length; i++)
			{
				// if not a comment && not empty
				if (tasks[i][0] != '#' && tasks[i] != '' && tasks[i] != '\n')
				{
					let item = new PopupMenu.PopupMenuItem(_(tasks[i]));
					let textClicked = tasks[i];
					item.connect('activate',
						function(){removeTask(textClicked,varFile);});
					this.menu.addMenuItem(item);
				}
			}
		}
		else { global.logError("Todo list : Error while reading file : " + this.file); }
		
		// Bottom section
		let bottomSection = new PopupMenu.PopupMenuSection();
		// Separator
		this.bottomSeparator = new PopupMenu.PopupSeparatorMenuItem();
		bottomSection.addMenuItem(this.bottomSeparator);
		// Add entry
		this.newTask = new St.Entry(
		{
			name: "searchEntry",
			hint_text: _("New task..."),
			track_hover: true,
			can_focus: true,
			style_class: 'newTask'
		});
		let entryNewTask = this.newTask.clutter_text;
		entryNewTask.connect('key-press-event', function(o,e)
		{
			let symbol = e.get_key_symbol();
		    	if (symbol == Clutter.Return)
		    	{
				addTask(o.get_text(),varFile);
		    		entryNewTask.set_text('');
			}
		});
		bottomSection.actor.add_actor(this.newTask);
		this.menu.addMenuItem(bottomSection);
    	},
   
	enable: function()
	{
		let _children = Main.panel._rightBox.get_children();
		Main.panel._rightBox.insert_actor(this.actor, 0);
		Main.panel._menus.addMenu(this.menu);
		// Refresh menu
		let fileM = Gio.file_new_for_path(this.file);
		this.monitor = fileM.monitor(Gio.FileMonitorFlags.NONE, null);
		this.monitor.connect('changed', Lang.bind(this, this._test));
	},

	disable: function()
	{
		Main.panel._menus.removeMenu(this.menu);
		Main.panel._rightBox.remove_actor(this.actor);
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
