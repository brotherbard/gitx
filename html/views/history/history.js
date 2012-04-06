var commit;

// Create a new Commit object
// obj: PBGitCommit object
var Commit = function(obj) {
	this.object = obj;

	this.refs = obj.refs();
	this.author_name = obj.author;
	this.committer_name = obj.committer;
	this.sha = obj.realSha();
	this.parents = obj.parents;
	this.subject = obj.subject;
	this.notificationID = null;

	// TODO:
	// this.author_date instant

	// This can be called later with the output of
	// 'git show' to fill in missing commit details (such as a diff)
	this.parseDetails = function(details) {
		this.raw = details;

		var diffStart = this.raw.indexOf("\ndiff ");
		var messageStart = this.raw.indexOf("\n\n") + 2;

		if (diffStart > 0) {
			this.message = this.raw.substring(messageStart, diffStart).replace(/^    /gm, "").escapeHTML();
			this.diff = this.raw.substring(diffStart);
		} else {
			this.message = this.raw.substring(messageStart).replace(/^    /gm, "").escapeHTML();
			this.diff = "";
		}
		this.header = this.raw.substring(0, messageStart);

		if (typeof this.header !== 'undefined') {
			var match = this.header.match(/\nauthor (.*) <(.*@.*|.*)> ([0-9].*)/);
			if (typeof match !== 'undefined' && typeof match[2] !== 'undefined') {
				if (!(match[2].match(/@[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/)))
					this.author_email = match[2];

				if (typeof match[3] !== 'undefined')
					this.author_date = new Date(parseInt(match[3]) * 1000);

				match = this.header.match(/\ncommitter (.*) <(.*@.*|.*)> ([0-9].*)/);
				if (typeof match[2] !== 'undefined')
					this.committer_email = match[2];
				if (typeof match[3] !== 'undefined')
					this.committer_date = new Date(parseInt(match[3]) * 1000);
			} 
		}
	}

	this.reloadRefs = function() {
		this.refs = this.object.refs();
	}

};


var confirm_gist = function(confirmation_message) {
	if (!Controller.isFeatureEnabled_("confirmGist")) {
		gistie();
		return;
	}

	// Set optional confirmation_message
	confirmation_message = confirmation_message || "Yes. Paste this commit.";
	var deleteMessage = Controller.getConfig_("github.token") ? " " : 'Since your <a target="_new" href="http://help.github.com/mac-set-up-git/#_set_up_your_info">github token</a> is not set, you will not be able to delete it.<br>';
	var publicMessage = Controller.isFeatureEnabled_("publicGist") ? "<b>public</b>" : "private";
	// Insert the verification links into div#notification_message
	var notification_text = 'This will create a ' + publicMessage + ' paste of your commit to <a target="_new" href="http://gist.github.com/">http://gist.github.com/</a><br>' +
	deleteMessage +
	'Are you sure you want to continue?<br/><br/>' +
	'<a href="#" onClick="hideNotification();return false;" style="color: red;">No. Cancel.</a> | ' +
	'<a href="#" onClick="gistie();return false;" style="color: green;">' + confirmation_message + '</a>';

	notify(notification_text, 0);
	// Hide img#spinner, since it?s visible by default
	$("spinner").style.display = "none";
}

var storage = {
	setKey: function(key, value) {
		return createCookie(key, value, 365 * 10);
	},

	getKey: function(key) {
		return readCookie(key);
	},

	deleteKey: function(key) {
		return eraseCookie(key);
	},
};

// See http://developer.github.com/v3/oauth/
var gistAuth = function() {
	var login = Controller.getConfig_("github.user");
	if (login) {
		var password = prompt("Enter GitHub password for " + login + " to authroize GitX to post gists:");
		if (!password || password.length == 0) {
			return gistie(true);
		}

		notify("Authenticating...", 0);

		var t = new XMLHttpRequest();
		t.onload = function() {
			if (t.status == 201) {
				try {
					var jsonResponse = JSON.parse(t.responseText);
					storage.setKey('oauth2token', jsonResponse.token);
					gistie();
				} catch (e) {
					authFailover("During parse: " + t.responseText);
				}
			} else {
				authFailover("Wrong status code (" + t.status + "): " + t.responseText);
			}
		}

		var jsonRequest = {
			scopes: 'gist',
			note: 'GitX'
		};

		t.open('POST', "https://api.github.com/authorizations");
		t.setRequestHeader('Accept', 'application/json');
		t.setRequestHeader('Authorization', makeBasicAuth(login, password));
		t.send(JSON.stringify(jsonRequest));
	}

	function authFailover(errorMessage) {
		notify("Authentication failed; creating an anonymous gist.", 0);
		Controller.log_(errorMessage);
		setTimeout(function() {
			gistie(true);
		}, 1000);
	}

	function makeBasicAuth(user, password) {
		var tok = user + ':' + password;
		var hash = Base64.encode(tok);
		return "Basic " + hash;
	}

}

var needsGithubPassword = function() {
	var login = Controller.getConfig_("github.user");
	var token = storage.getKey('oauth2token');

	return login && !token;
}

var gistie = function(skipAuth) {
	if (!skipAuth && needsGithubPassword())
		return gistAuth();

	notify("Creating a Gist...", 0);

	// See API at http://developer.github.com/v3/gists/
	var filename = commit.object.subject.replace(/[^a-zA-Z0-9]+/g, "-") + ".patch";
	var files = {};
	files[filename] = { content: commit.object.patch() };
	var postdata = {
		description: commit.object.subject + " : " + commit.object.realSha(),
		public: Controller.isFeatureEnabled_("publicGist") ? 'true' : 'false',
		files: files,
	};

	var t = new XMLHttpRequest();
	t.onload = function() {
		if (t.status == 201) {
			var responseJson = JSON.parse(t.responseText);
			var gistURL = responseJson.html_url;
			try {
				notify("Gist posted: <a target='_new' href='" + gistURL + "'>" + gistURL + "</a>", 1);
			} catch (e) {
				notify("Gist creation failed: " + e + "; \n" + t.responseText, -1);
				Controller.log_(t.responseText);
			}
		} else if (t.status == 401) { // Authentication fail
			// Clear out our saved credentials, since they're not working
			storage.deleteKey('oauth2token');
			gistAuth();
		} else {
			notify("Gist creation failed with HTTP " + t.status + ": " + t.responseText, -1);
			Controller.log_(t.status);
			Controller.log_(t.responseText);
		}
	};

	t.open('POST', "https://api.github.com/gists");
	t.setRequestHeader('Accept', 'application/json');
	var token = storage.getKey('oauth2token');
	if (token) {
		t.setRequestHeader('Authorization', 'token ' + token);
	}

	try {
		t.send(JSON.stringify(postdata));
	} catch(e) {
		notify("Failed to send JSON when sending the Gist data: " + e, -1);
	}
}

var setGravatar = function(email, image) {
	if(Controller && !Controller.isFeatureEnabled_("gravatar")) {
		image.src = "";
		return;
	}

	if (!email) {
		image.src = "http://www.gravatar.com/avatar/?d=wavatar&s=60";
		return;
	}

	image.src = "http://www.gravatar.com/avatar/" +
		hex_md5(email.toLowerCase().replace(/ /g, "")) + "?d=wavatar&s=60";
}

var selectCommit = function(a) {
	Controller.selectCommit_(a);
}

// Relead only refs
var reload = function() {
	$("notification").style.display = "none";
	commit.reloadRefs();
	showRefs();
}

var showRefs = function() {
	var refs = $("refs");
	if (commit.refs) {
		refs.parentNode.style.display = "";
		refs.innerHTML = "";
		for (var i = 0; i < commit.refs.length; i++) {
			var ref = commit.refs[i];
			refs.innerHTML += '<span class="refs ' + ref.type() + (commit.currentRef == ref.ref ? ' currentBranch' : '') + '">' + ref.shortName() + '</span> ';
		}
	} else
		refs.parentNode.style.display = "none";
}

var loadCommit = function(commitObject, currentRef) {
	// These are only the things we can do instantly.
	// Other information will be loaded later by loadCommitDetails,
	// Which will be called from the controller once
	// the commit details are in.

	if (commit && commit.notificationID)
		clearTimeout(commit.notificationID);

	commit = new Commit(commitObject);
	commit.currentRef = currentRef;

	$("commitID").innerHTML = commit.sha;
	$("authorID").innerHTML = commit.author_name;
	$("subjectID").innerHTML = commit.subject.escapeHTML();
	$("diff").innerHTML = ""
	$("message").innerHTML = ""
	$("files").innerHTML = ""
	$("date").innerHTML = ""
	showRefs();

	for (var i = 0; i < $("commit_header").rows.length; ++i) {
		var row = $("commit_header").rows[i];
		if (row.innerHTML.match(/Parent:/)) {
			row.parentNode.removeChild(row);
			--i;
		}
	}

	// Scroll to top
	scroll(0, 0);

	if (!commit.parents)
		return;

	for (var i = 0; i < commit.parents.length; i++) {
		var newRow = $("commit_header").insertRow(-1);
		newRow.innerHTML = "<td class='property_name'>Parent:</td><td>" +
			"<a href='' onclick='selectCommit(this.innerHTML); return false;'>" +
			commit.parents[i].string + "</a></td>";
	}

	commit.notificationID = setTimeout(function() { 
		if (!commit.fullyLoaded)
			notify("Loading commit…", 0);
		commit.notificationID = null;
	}, 500);

}

var showDiff = function() {

	$("files").innerHTML = "";

	// Callback for the diff highlighter. Used to generate a filelist
	var newfile = function(name1, name2, id, mode_change, old_mode, new_mode) {
		var img = document.createElement("img");
		var p = document.createElement("p");
		var link = document.createElement("a");
		link.setAttribute("href", "#" + id);
		p.appendChild(link);
		var finalFile = "";
		if (name1 == name2) {
			finalFile = name1;
			img.src = "../../images/modified.png";
			img.title = "Modified file";
			p.title = "Modified file";
			if (mode_change)
				p.appendChild(document.createTextNode(" mode " + old_mode + " -> " + new_mode));
		}
		else if (name1 == "/dev/null") {
			img.src = "../../images/added.png";
			img.title = "Added file";
			p.title = "Added file";
			finalFile = name2;
		}
		else if (name2 == "/dev/null") {
			img.src = "../../images/removed.png";
			img.title = "Removed file";
			p.title = "Removed file";
			finalFile = name1;
		}
		else {
			img.src = "../../images/renamed.png";
			img.title = "Renamed file";
			p.title = "Renamed file";
			finalFile = name2;
			p.insertBefore(document.createTextNode(name1 + " -> "), link);
		}

		link.appendChild(document.createTextNode(finalFile));
		link.setAttribute("representedFile", finalFile);

		p.insertBefore(img, link);
		$("files").appendChild(p);
	}

	var binaryDiff = function(filename) {
		if (filename.match(/\.(png|jpg|icns|psd)$/i))
			return '<a href="#" onclick="return showImage(this, \'' + filename + '\')">Display image</a>';
		else
			return "Binary file differs";
	}
	
	highlightDiff(commit.diff, $("diff"), { "newfile" : newfile, "binaryFile" : binaryDiff });
}

var showImage = function(element, filename)
{
	element.outerHTML = '<img src="GitX://' + commit.sha + '/' + filename + '">';
	return false;
}

var enableFeature = function(feature, element)
{
	if(!Controller || Controller.isFeatureEnabled_(feature)) {
		element.style.display = "";
	} else {
		element.style.display = "none";
	}
}

var enableFeatures = function()
{
	enableFeature("gist", $("gist"))
	enableFeature("gravatar", $("author_gravatar").parentNode)
	enableFeature("gravatar", $("committer_gravatar").parentNode)
}

var loadCommitDetails = function(data)
{
	commit.parseDetails(data);

	if (commit.notificationID)
		clearTimeout(commit.notificationID)
	else
		$("notification").style.display = "none";

	var formatEmail = function(name, email) {
		return email ? name + " &lt;<a href='mailto:" + email + "'>" + email + "</a>&gt;" : name;
	}

	$("authorID").innerHTML = formatEmail(commit.author_name, commit.author_email);
	$("date").innerHTML = commit.author_date;
	setGravatar(commit.author_email, $("author_gravatar"));

	if (commit.committer_name != commit.author_name) {
		$("committerID").parentNode.style.display = "";
		$("committerID").innerHTML = formatEmail(commit.committer_name, commit.committer_email);

		$("committerDate").parentNode.style.display = "";
		$("committerDate").innerHTML = commit.committer_date;
		setGravatar(commit.committer_email, $("committer_gravatar"));
	} else {
		$("committerID").parentNode.style.display = "none";
		$("committerDate").parentNode.style.display = "none";
	}

	$("message").innerHTML = commit.message.replace(/\n/g,"<br>");

	if (commit.diff.length < 200000)
		showDiff();
	else
		$("diff").innerHTML = "<a class='showdiff' href='' onclick='showDiff(); return false;'>This is a large commit. Click here or press 'v' to view.</a>";

	hideNotification();
	enableFeatures();
}
