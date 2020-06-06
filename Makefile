SHELL=/bin/bash

iconsrc := store/icons/icon-512.png
icondir := src/images/icons
iconsizes := {16,24,32,48,64,128,256}
iconfiles := $(shell echo $(icondir)/icon-$(iconsizes).png)

$(icondir)/icon-%.png:
	@mkdir -p $(@D)
	magick convert $(iconsrc) -resize $* $@

icons: $(iconfiles)

zip: icons
	cd src; zip -r ../dist.zip ./

.PHONY: icons zip