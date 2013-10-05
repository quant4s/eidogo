
var NS = Y.namespace('Eidogo');

NS.Toolbar = function (cfg) {
	cfg = cfg || {}
    NS.Toolbar.superclass.constructor.apply(this,arguments);

	if(cfg.player)
		this.player = cfg.player;
	else
		throw "No player!"

	this.srcNode = Y.one(cfg.srcNode);

	if( this.srcNode )
		this.render();
}
NS.Toolbar.NAME = "eidogo-toolbar";

NS.Toolbar.ATTRS = {
};

Y.extend(NS.Toolbar, Y.Widget, {
    renderUI: function()
	{
		var html = "<button class='eidogo-back'>&lt;</button><button class='eidogo-fwd'>&gt;</button>";
		this.srcNode.append(html);
		this.backButton = new Y.Button({
			srcNode: this.srcNode.one('.eidogo-back')
		}).render();
		this.forwardButton = new Y.Button({
			srcNode: this.srcNode.one('.eidogo-fwd')
		}).render();
	},
	bindUI: function()
	{
		this.backButton.on('click', function(e){this.player.back()}, this); 
		this.forwardButton.on('click', function(e){this.player.forward()}, this); 
	}
});