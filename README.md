# NotExp

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F52OY0N)

[![Get on Addons Mozilla Online](https://extensionworkshop.com/assets/img/documentation/publish/get-the-addon-178x60px.dad84b42.png)](https://addons.mozilla.org/en-US/firefox/addon/notexp/)
[![Get on Chrome Web Store](https://github.com/user-attachments/assets/e52c6e4c-10c5-4723-8a6a-014c042e02ea)](https://chromewebstore.google.com/detail/notexp/lbghdcdjdfngepdkmmemagflaekkmjmf)
[![Get on Microsoft Edge](assets/get-it-from-MS.png)](https://microsoftedge.microsoft.com/addons/detail/notexp/iajdflbejglpfjcginldhjbfccepabfj)

[![Translation status](https://hosted.weblate.org/widget/notexp/addon/287x66-grey.png)](https://hosted.weblate.org/engage/notexp/)

## What is NotExp?

NotExp is a browser extension that converts OneNote notes into open-source formats.
This is an evolution of my [old Python script](https://github.com/nico9889/OneNote2Xournalpp) that did more or less the
same thing, but in a more complex way.

This add-on is useful for people who want to migrate to one of the supported applications without completely losing
their
notes.
In particular, differently from OneNote, the supported programs have full cross-platform support.

Please note that there's **no way** to convert your notes back or import them again into OneNote.

## How does it work?

The add-on parses the content of the OneNote page, detecting the following elements:

* Images
* Pen/highlighter strokes
* Text blocks
* Math blocks

Once identified, it converts them from HTML to the selected target format as accurately as possible.
The conversion is performed entirely locally on your computer; no data is collected or sent to external servers.

## How to use it

Follow these steps for the best results:

1. Open the notes you want to convert.
2. Scroll to the very end of the page. This step is **necessary** because OneNote loads images and strokes lazily (
   gradually); scrolling forces it to download all content.
3. Press the add-on button on the Toolbar, click the "Export" button, and wait.

Once the process is complete, the converted notes will be saved to your device as a downloaded file.

The time required for conversion depends on the amount of content in your notes and your computer's processing power. In
general, a medium-sized file should take less than a minute.

## Compatibility table

Not all the elements of OneNote can be exported to the supported formats.
The following table shows the status of the conversion for each type of element.

| OneNote Element | Xournal++ | RNote | Excalidraw |
|-----------------|-----------|-------|------------|
| Strokes         | ✅         | ✅     | ✅          |
| Images          | ✅         | ✅     | ✅          |
| Texts           | ⚠️¹       | ⚠️¹   | ⚠️¹        |
| Math            | ✅         | ⚠️²   | ⚠️³        |
| Tables          | ❌         | ❌     | ❌          |

✅ **Fully supported**: Readable and fully editable in the target application.
⚠️ **Partial support**: Readable, but may be difficult to edit.
❌ **Unsupported**: Completely omitted from the export.

¹ Properly converting text layout is challenging because each application handles text representation differently.
NotExp aims to preserve the exact absolute position of every text fragment to maintain alignment with other elements (
such as highlights, images, and math layout) and ensure readability. Unfortunately, this means text is often split into
multiple separate blocks, making it harder to edit afterward.

² At the time of writing, RNote does not natively support math equations. There is
an [open pull request](https://github.com/flxzt/rnote/pull/1587) to introduce Typst support. Until this is merged, math
elements will be exported into RNote as images.

³ At the time of writing, Excalidraw supports math only through an external plugin, which requires compiling the program
from source. This makes it unavailable for most users.
As for RNote, math elements will be exported only as images.

## Development

This add-on is entirely written in TypeScript.

To build and work on the project, you need **Node.js** and **NPM** installed.

* Clone the repository

```bash
git clone https://codeberg.org/nico9889/NotExp.git
cd NotExp
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

This command generates a dist directory containing the minified JavaScript files and all required assets.

* To pack the add-on in a ZIP file:

``` bash
npm run pack
```

This command compresses the dist folder into the web-ext-artifacts directory, making it ready for manual installation in
your browser.

## Translations

This project is supported by the **Hosted Weblate Libre Plan**.

It is officially maintained in English and Italian. Other languages are contributed by volunteers, and their accuracy
cannot be fully guaranteed.

You are welcome to contribute new translations or improve existing ones on
Weblate:https://github.com/nico9889/NotExp/wiki/Internationalization#weblate

