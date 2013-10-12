/**
 * EidoGo -- Web-based SGF Editor
 * Copyright (c) 2007, Justin Kramer <jkkramer@gmail.com>
 * Code licensed under AGPLv3:
 * http://www.fsf.org/licensing/licenses/agpl-3.0.html
 *
 * This file contains GameNode and GameCursor.
 */

var NS = Y.namespace('Eidogo');
/**
 * For uniquely identifying nodes. Should work even if we have
 * multiple Player instantiations. Setting this to 100000 is kind of a hack
 * to avoid overlap with ids of as-yet-unloaded trees.
 */
NS.gameNodeIdCounter = 100000;

/**
 * @class GameNode holds SGF-like data containing things like moves, labels
 * game information, and so on. Each GameNode has children and (usually) a
 * parent. The first child is the main line.
 */

/**
 * @constructor
 * @param {GameNode} parent Parent of the node
 * @param {Object} properties SGF-like JSON object to load into the node
 */
NS.GameNode = function(parent, properties, id) {
    //   NS.GameNode.superclass.constructor.apply(this,{});
    this._id = (typeof id != "undefined" ? id : NS.gameNodeIdCounter++);
    this._parent = parent || null;
    this._children = [];
    this._preferredChild = 0;
    if (properties)
        this.loadJson(properties);
};

NS.GameNode.NAME = "eidogo-gamenode";

NS.GameNode.prototype =  {
    //Pree-init properties for V8 speed, and as a potential error check of valid properties.
    AB: null,
    AE: null,
    AN: null,
    AP: null,
    AR: null,
    AS: null,
    AW: null,
    B:  null,
    BL: null,
    BM: null,
    BR: null,
    BT: null,
    C : null,
    CA: null,
    CP: null,
    CR: null,
    DD: null,
    DM: null,
    DO: null,
    DT: null,
    EV: null,
    FF: null,
    FG: null,
    GB: null,
    GC: null,
    GM: null,
    GN: null,
    GW: null,
    HA: null,
    HO: null,
    IP: null,
    IT: null,
    IY: null,
    KM: null,
    KO: null,
    LB: null,
    LN: null,
    MA: null,
    MN: null,
    N: null,
    OB: null,
    ON: null,
    OT: null,
    OW: null,
    PB: null,
    PC: null,
    PL: null,
    PM: null,
    PW: null,
    RE: null,
    RO: null,
    RU: null,
    SE: null,
    SL: null,
    SO: null,
    SQ: null,
    ST: null,
    SU: null,
    SZ: null,
    TB: null,
    TE: null,
    TM: null,
    TR: null,
    TW: null,
    UC: null,
    US: null,
    V:  null,
    VW: null,
    W:  null,
    WL: null,
    WR: null,
    WT: null,
    /**
     * Adds a property to this node without replacing existing values. If
     * the given property already exists, it will make the value an array
     * containing the given value and any existing values.
     **/
    pushProperty: function(prop, value) {
        if (this[prop]) {
            if (!(this[prop] instanceof Array))
                this[prop] = [this[prop]];
            if (this[prop].indexOf(value) == -1)
                this[prop].push(value);
        } else {
            this[prop] = value;
        }
    },
    /**
     * Check whether this node contains the given property with the given
     * value
     **/
    hasPropertyValue: function(prop, value) {
        if (!this[prop]) return false;
        var values = (this[prop] instanceof Array ? this[prop] : [this[prop]]);
        return values.contains(value);
    },
    /**
     * Removes a value from property or properties. If the value is the only
     * one for the property, removes the property also. Value can be a RegExp
     * or a string
     **/
    deletePropertyValue: function(prop, value) {
        var test = (value instanceof RegExp) ?
            function(v) { return value.test(v); } :
        function(v) { return value == v; };
        var props = (prop instanceof Array ? prop : [prop]);
        for (var i = 0; prop = props[i]; i++) {
            if (this[prop] instanceof Array) {
                this[prop] = this[prop].filter(function(v) { return !test(v); });
                if (!this[prop].length) delete this[prop];
            } else if (test(this.prop)) {
                delete this[prop];
            }
        }
    },
    /**
     * Loads SGF-like data given in JSON format:
     *      {PROP1: VALUE, PROP2: VALUE, _children: [...]}
     * Node properties will be overwritten if they exist or created if they
     * don't.
     *
     * We use a stack instead of recursion to avoid recursion limits.
     **/
    loadJson: function(data) {
        var jsonStack = [data], gameStack = [this];
        var jsonNode, gameNode;
        var i, len;
        while (jsonStack.length) {
            jsonNode = jsonStack.pop();
            gameNode = gameStack.pop();
            gameNode.loadJsonNode(jsonNode);
            len = (jsonNode._children ? jsonNode._children.length : 0);
            for (i = 0; i < len; i++) {
                jsonStack.push(jsonNode._children[i]);
                if (!gameNode._children[i])
                    gameNode._children[i] = new NS.GameNode(gameNode);
                gameStack.push(gameNode._children[i]);
            }
        }
    },
    /**
     * Adds properties to the current node from a JSON object
     **/
    loadJsonNode: function(data) {
        for (var prop in data) {
            if (prop == "_id") {
                this[prop] = data[prop].toString();
                NS.gameNodeIdCounter = Math.max(NS.gameNodeIdCounter,
                                                parseInt(data[prop], 10));
                continue;
            }
            if (prop.charAt(0) != "_")
                this[prop] = data[prop];
        }
    },
    /**
     * Add a new child (variation)
     **/
    appendChild: function(node) {
        if( typeof node == "undefined" )
            node = new NS.GameNode();

        node._parent = this;
        this._children.push(node);

        return node;
    },
    /**
     * Returns all the properties for this node
     **/
    getProperties: function() {
        var properties = {}, propName, isReserved, isString, isArray;
        for (propName in this) {
            isPrivate = (propName.charAt(0) == "_");
            isString = (typeof this[propName] == "string");
            isArray = (this[propName] instanceof Array);
            if (!isPrivate && (isString || isArray))
                properties[propName] = this[propName];
        }
        return properties;
    },
    /**
     * Applies a function to this node and all its children, recursively
     * (although we use a stack instead of actual recursion)
     **/
    walk: function(fn, thisObj, depthFirst) {
        var collection = [this];
        var node;
        var i, len;
        while (collection.length) {
            node = depthFirst ? collection.shift() : collection.pop();

            if( fn.call(thisObj || this, node) ) break;
            len = (node._children ? node._children.length : 0);
            for (i = 0; i < len; i++)
            {
                if( depthFirst) collection.unshift(node._children[i])
                else collection.push(node._children[i]);
            }
        }
    },
    /**
     * Get the current black or white move as a raw SGF coordinate
     **/
    getMove: function() {
        if(typeof this.W == "string") return this.W;
        else if (typeof this.B == "string") return this.B;
        return null;
    },
    getMoveColor: function()
    {
        if (typeof this.W == "string") return "W";
        if (typeof this.B == "string") return "B";
        return null;
    },
    /**
     * Empty the current node of any black or white stones (played or added)
     **/
    emptyPoint: function(coord) {
        var props = this.getProperties();
        var deleted = null;
        for (var propName in props) {
            if (propName == "AW" || propName == "AB" || propName == "AE") {
                if (!(this[propName] instanceof Array))
                    this[propName] = [this[propName]];
                this[propName] = this[propName].filter(function(val) {
                    if (val == coord) {
                        deleted = val;
                        return false;
                    }
                    return true;
                });
                if (!this[propName].length)
                    delete this[propName];
            } else if ((propName == "B" || propName == "W") && this[propName] == coord) {
                deleted = this[propName];
                delete this[propName];
            }
        }
        return deleted;
    },
    countSiblings: function()
    {
        return this._parent ? this._parent.countChildren() - 1 : 0;
    },
    countChildren: function()
    {
        return this._children ? this._children.length : 0;
    },
    /**
     * Returns the node's position in its parent's _children array
     **/
    getPosition: function() {
        if (!this._parent) return null;
        var siblings = this._parent._children;
        for (var i = 0; i < siblings.length; i++)
            if (siblings[i]._id == this._id) {
                return i;
            }
        return null;
    },
    /**
     * Converts this node and all children to SGF
     **/
    toSgf: function() {
        var sgf = (this._parent ? "(" : "");
        var node = this;
        
        function propsToSgf(props) {
            if (!props) return "";
            var sgf = ";", key, val;
            for (key in props) {
                if (props[key] instanceof Array) {
                    val = props[key].map(function (val) {
                        return val.toString().replace(/\]/g, "\\]");
                    }).join("][");
                } else {
                    val = props[key].toString().replace(/\]/g, "\\]");
                }
                sgf += key + "[" + val  + "]";
            }
            return sgf;
        }
        
        sgf += propsToSgf(node.getProperties());
        
        // Follow main line until we get to a node with multiple variations
        while (node._children.length == 1) {
            node = node._children[0];
            sgf += propsToSgf(node.getProperties());
        }
        
        // Variations
        for (var i = 0; i < node._children.length; i++) {
            sgf += node._children[i].toSgf();
        }
        
        sgf += (this._parent ? ")" : "");
        
        return sgf;
    }
};



/**
 * @class GameCursor is used to navigate among the nodes of a game tree.
 */
NS.GameCursor = function(node) {
    // NS.GameCursor.superclass.constructor.apply(this,{});
    this.node = node;
}

NS.GameCursor.prototype = {
    /**
     * @constructor
     * @param {NS.GameNode} A node to start with
     */
    next: function(varNum) {
        if (!this.hasNext()) return false;
        varNum = (typeof varNum == "undefined" || varNum == null ?
                  this.node._preferredChild : varNum);
        this.node._preferredChild = varNum;
        this.node = this.node._children[varNum];
        return true;
    },
    previous: function() {
        if (!this.hasPrevious()) return false;
        this.node = this.node._parent;
        return true;
    },
    hasNext: function() {
        return this.node && this.node._children.length;
    },
    hasPrevious: function() {
        // Checking _parent of _parent is to prevent returning to root
        return this.node && this.node._parent && this.node._parent._parent;
    },
    getNextMoves: function() {
        if (!this.hasNext()) return null;
        var moves = {};
        var i, node;
        for (i = 0; node = this.node._children[i]; i++)
            moves[node.getMove()] = i;
        return moves;
    },
    getNextColor: function() {
        if (!this.hasNext()) return null;
        var i, node;
        for (var i = 0; node = this.node._children[i]; i++)
            if (node.getColor())
                return node.getColor();
        return null;
    },
    getNextNodeWithVariations: function() {
        var node = this.node;
        while (node._children.length == 1)
            node = node._children[0];
        return node;
    },
    getPath: function() {
        var n = this.node,
        rpath = [],
        mn = 0;
        while ( n && n.getPosition() != null) {
            mn++;
            rpath.push(n.getPosition());
            n = n._parent;
        }
        return rpath.reverse();
    },
    getPathMoves: function() {
        var n = this.node,
        rpath = [],
        mn = 0;
        while (n && n.getPosition() != null) {
            mn++;
            rpath.push(n.getMove());
            n = n._parent;
        }
        return rpath.reverse();
    },
    getMoveNumber: function() {
        var num = 0,
        node = this.node;
        while (node) {
            if (node.W || node.B) num++;
            node = node._parent;
        }
        return num;
    },
    getGameRoot: function() {
        if (!this.node) return null;
        var cur = new NS.GameCursor(this.node);
        // If we're on the tree root, return the first game
        if (!this.node._parent && this.node._children.length)
            return this.node._children[0];
        while (cur.previous()) {};
        return cur.node;
    }
};