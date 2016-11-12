// Authors:
// * Baptiste Saleil http://bsaleil.org/
// * Community: https://github.com/bsaleil/todolist-gnome-shell-extension/network
// With code from: https://github.com/vibou/vibou.gTile
//
// Licence: GPLv2+

const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Utils = imports.misc.extensionUtils.getCurrentExtension().imports.utils;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

const Gettext = imports.gettext;
const _ = Gettext.domain('todolist').gettext;

const OPEN_TODOLIST_KEY = 'open-todolist';
const COPY_TO_CLIPBOARD_KEY = 'clipboard';

function init()
{
}

// Build prefs UI
function buildPrefsWidget()
{
	// Read locale files
	let locales = Extension.dir.get_path() + "/locale";
	Gettext.bindtextdomain('todolist', locales);

	let opentodolist_str = _("Open todolist");
	let clipboard_str = _("Copy text of removed item to clipboard");

	// Get settings

	let settings = Utils.getSettings();

	//Shortcut Box

	let shortcut_hbox = new Gtk.HBox({margin_left: 20, margin_top: 10, spacing: 6});
	let model = new Gtk.ListStore();

	model.set_column_types([
		GObject.TYPE_INT,
		GObject.TYPE_INT
	]);
	let row = model.append();
	let binding = settings.get_strv(OPEN_TODOLIST_KEY)[0];
	let key, mods;
	if (binding) {
		[key, mods] = Gtk.accelerator_parse(binding);
	} else {
		[key, mods] = [0, 0];
	}
	model.set(row, [0, 1], [mods, key]);

	let treeview = new Gtk.TreeView({ 'expand': false, 'model': model });
	let cellrend = new Gtk.CellRendererAccel({
		'editable': true,
		'accel-mode': Gtk.CellRendererAccelMode.GTK
	});

	cellrend.connect('accel-edited', function(rend, iter, key, mods) {
		let value = Gtk.accelerator_name(key, mods);
		let [succ, iterator] = model.get_iter_from_string(iter);

		if (!succ) {
			throw new Error("Error updating keybinding");
		}

		model.set(iterator, [0, 1], [mods, key]);
		settings.set_strv(OPEN_TODOLIST_KEY, [value]);
	});

	cellrend.connect('accel-cleared', function(rend, iter, key, mods) {
		let [succ, iterator] = model.get_iter_from_string(iter);

		if (!succ) {
			throw new Error("Error clearing keybinding");
		}

		model.set(iterator, [0, 1], [0, 0]);
		settings.set_strv(OPEN_TODOLIST_KEY, []);
	});

	let col = new Gtk.TreeViewColumn({ min_width: 200 });

	col.pack_end(cellrend, false);
	col.add_attribute(cellrend, 'accel-mods', 0);
	col.add_attribute(cellrend, 'accel-key', 1);
	treeview.append_column(col);
	treeview.set_headers_visible(false);

	shortcut_hbox.pack_start(new Gtk.Label({
		label: _("Open todolist"),
		use_markup: true,
		xalign: 0
	}), true, true, 0);
	shortcut_hbox.pack_end(treeview, false, true, 0);

	settings.connect('changed::shortcut-keybind', function(k, b) {
		let row = model.get(0);
		model.set(row, [0, 1], settings.get_strv(b));
	});


	// Switch Box

	let switch_hbox = new Gtk.HBox({margin_left: 20, margin_top: 10, spacing: 6});
	let onoff = new Gtk.Switch({active: settings.get_boolean(COPY_TO_CLIPBOARD_KEY)});

	switch_hbox.pack_start(new Gtk.Label({
		label: clipboard_str,
		use_markup: true,
		xalign: 0
	}), true, true, 0);
	switch_hbox.pack_end(onoff, false, false, 0);

	settings.connect('changed::'+COPY_TO_CLIPBOARD_KEY, function(k,b) {
		onoff.set_active(settings.get_boolean(b));
	});

	onoff.connect('notify::active', function(w) {
		settings.set_boolean(COPY_TO_CLIPBOARD_KEY, w.active);
	});

	//Draw frame

	let frame = new Gtk.VBox({border_width: 10, spacing: 6});

	frame.pack_start(shortcut_hbox, false,false, 0);

	frame.pack_start(switch_hbox, false,false, 0);

	frame.show_all();

	return frame;
}
