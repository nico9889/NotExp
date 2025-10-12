# NotExp
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F52OY0N)

[![Get on Addons Mozilla Online](https://extensionworkshop.com/assets/img/documentation/publish/get-the-addon-178x60px.dad84b42.png)](https://addons.mozilla.org/en-US/firefox/addon/notexp/)
[![Get on Chrome Web Store](https://github.com/user-attachments/assets/e52c6e4c-10c5-4723-8a6a-014c042e02ea)](https://chromewebstore.google.com/detail/notexp/lbghdcdjdfngepdkmmemagflaekkmjmf)
[![Get on Microsoft Edge](assets/get-it-from-MS.png)](https://microsoftedge.microsoft.com/addons/detail/notexp/iajdflbejglpfjcginldhjbfccepabfj)


[![Translation status](https://hosted.weblate.org/widget/notexp/addon/287x66-grey.png)](https://hosted.weblate.org/engage/notexp/)

This is an addon for browser that permits to convert OneNote notes into Xournal++ XOPP format.

# Mirrors
This project has been migrated to Codeberg as GitHub is becoming more and more bloated over time, especially in the recent days with the introduction of the AI ​​features and it no longer feels like a good "homebase" for my projects anymore to me.

You can find a mirror this project source code in the following places:
| Platform | URL                                |
| ---------| ---------------------------------- |
| GitHub   | https://github.com/nico9889/NotExp |


# Motivation
This is an evolution of my [old Python script](https://github.com/nico9889/OneNote2Xournalpp) that did more or less the same thing.
The difference with the Python script is that the addons works directly inside the browser so it can retrieve more data useful (mainly offsets between elements once rendered) to the conversion.

Exporting your note into Xournal++ format can be useful for multiple reason:
* the web version of OneNote is painfully slow;
* once converted to Xournal++ you can export an high quality PDF, so you can view your notes offline from any device;
* Xournal++ is open source :D

Please note that there's **no way** to convert back your notes or import them again into OneNote.

# How does it work
This add-on scans the page for images, pen/highlighter strokes, texts and maths blocks.

Once identified, it attempts to convert them as best as it can from HTML format to a Xournal++ compatible format.

The conversion is performed entirely on your computer; no data is collected or sent to external servers.

# How to use

There are a few steps to follow for optimal results:

* Open the notes you want to convert.
* Scroll to the very end of the notes. This step is necessary because OneNote loads images and strokes gradually, and doing this forces it to download everything.
* Press the add-on button on the Toolbar, click "Export," and wait.

Once completed, the notes will be saved to your device as a downloaded file.

The time required for conversion will depend on your device's power and the amount of content in your notes.

With a medium size file and a relatively beefy computer it requires no more than a second to export the file, I suppose it should take less than a minute in any other case with some exceptions.

# Development

This add-on is entirely written in TypeScript.

To work on the code, you need NPM, then with a terminal

* Clone the repository
```bash
git clone https://github.com/nico9889/NotExp.git
```

* Install the dependencies
```bash 
npm install
```

At this point you are ready to work.

* To build the add-on:
```bash
npm run build
```
This command creates a "dist" directory containing the reduced JS file and the required assets

* To pack the add-on in a ZIP file:
``` bash
npm run pack
```
This command creates a "web-ext-artifacts" directory containing the content of the "dist" foled zipped, ready to be installed on your browser.

# Translations
This project has been approved for Hosted Weblate Libre Plan.

You can find information on translations in the dedicated Wiki page: https://github.com/nico9889/NotExp/wiki/Internationalization#weblate
