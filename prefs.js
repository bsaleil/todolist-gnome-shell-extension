// This extension was developed by :
// * Baptiste Saleil http://bsaleil.org/
// * Community : https://github.com/bsaleil/todolist-gnome-shell-extension/network
// With code from :https://github.com/vibou/vibou.gTile
//
// Licence: GPLv2+

const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Utils = imports.misc.extensionUtils.getCurrentExtension().imports.utils;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

const Gettext = imports.gettext;
const _ = Gettext.domain('todolist').gettext;

let name_str = "";
let value_str = "";
let opentodolist_str = "";

function append_hotkey(model, settings, name, pretty_name)
{
	let [key, mods] = Gtk.accelerator_parse(settings.get_strv(name)[0]);
	let row = model.insert(10);
	model.set(row, [0, 1, 2, 3], [name, pretty_name, mods, key ]);
}

function init()
{
}

// Build prefs UI 
function buildPrefsWidget()
{	
	// Read locale files
	let locales = Extension.dir.get_path() + "/locale";
	Gettext.bindtextdomain('todolist', locales);
	name_str = _("Name");
	value_str = _("Value");
	opentodolist_str = _("Open todolist");
	
	let pretty_names = { 'open-todolist': opentodolist_str }

	let model = new Gtk.ListStore();

	model.set_column_types
	([
		GObject.TYPE_STRING,
		GObject.TYPE_STRING,
		GObject.TYPE_INT,
		GObject.TYPE_INT
	]);

	let settings = Utils.getSettings();

	for(key in pretty_names)
	{
		append_hotkey(model, settings, key, pretty_names[key]);
	}

	let treeview = new Gtk.TreeView(
	{
		'expand': true,
		'model': model
	});

	let col;
	let cellrend;

	cellrend = new Gtk.CellRendererText();

	col = new Gtk.TreeViewColumn(
	{
		'title': name_str,
		'expand': true
	});

	col.pack_start(cellrend, true);
	col.add_attribute(cellrend, 'text', 1);

	treeview.append_column(col);

	cellrend = new Gtk.CellRendererAccel({
		'editable': true,
		'accel-mode': Gtk.CellRendererAccelMode.GTK
	});

	cellrend.connect('accel-edited', function(rend, iter, key, mods) {
		let value = Gtk.accelerator_name(key, mods);
		
		let [succ, iter ] = model.get_iter_from_string(iter);
		
		if(!succ) {
			throw new Error("Something be broken, yo.");
		}

		let name = model.get_value(iter, 0);

		model.set(iter, [ 2, 3 ], [ mods, key ]);

		global.log("Changing value for " + name + ": " + value);

		settings.set_strv(name, [value]);
	});

	col = new Gtk.TreeViewColumn({
		'title': value_str
	});

	col.pack_end(cellrend, false);
	col.add_attribute(cellrend, 'accel-mods', 2);
	col.add_attribute(cellrend, 'accel-key', 3);

	treeview.append_column(col);

	let win = new Gtk.ScrolledWindow(
	{
		'vexpand': true
	});
	win.add(treeview);	
	win.show_all();

	return win;
}
