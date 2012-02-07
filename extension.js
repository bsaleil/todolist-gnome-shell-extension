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

const Gettext = imports.gettext;

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

		let userExtensionLocalePath = metadata.path + '/locale';
 
		Gettext.bindtextdomain("todolist", userExtensionLocalePath);
		Gettext.textdomain("todolist");
		
		this.buttonText = new St.Label({text:Gettext.gettext("Tasks...")});
		this.actor.add_actor(this.buttonText);
		this._test();
    	},
    	
    	_test: function()
    	{    	
    		// Clear all
    		this.menu.removeAll();		
		
		// Tasks
		let varFile = this.file;
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
					item.connect('activate',
						function(){removeTask(textClicked,varFile);});
					this.menu.addMenuItem(item);
					
					tasks += 1;
				}
			}
			
			switch (tasks)
			{
				case 0 :this.buttonText.set_text(Gettext.gettext("No task")); break;
				case 1 :this.buttonText.set_text(Gettext.gettext("1 task")); break;
				default:this.buttonText.set_text(tasks + " " + Gettext.gettext("tasks")); break;
			}
		}
		else { global.logError("Todo list : Error while reading file : " + this.file); }
		
		// Separator
		this.Separator = new PopupMenu.PopupSeparatorMenuItem();
		this.menu.addMenuItem(this.Separator);
		
		// Bottom section
		let bottomSection = new PopupMenu.PopupMenuSection();
		
		this.newTask = new St.Entry(
		{
			name: "searchEntry",
			hint_text: Gettext.gettext("New task..."),
			track_hover: true,
			can_focus: true
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
		bottomSection.actor.add_style_class_name("newTaskSection");
		this.menu.addMenuItem(bottomSection);
    	},
    	
	updateTasksNumber: function(text)
	{
		let number = text.innerHTML.split("\\n" ).length;
		this.buttonText.set_text(number + "tasks");
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
