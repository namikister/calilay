makexpi = ./makexpi.sh
name = calilay

$(name).xpi: chrome.manifest.pack install.rdf content/ defaults/
	$(makexpi) -n $(name)

clean:
	$(RM) sha1hash.txt $(name).xpi $(name)_noupdate.xpi *~ \#*\#