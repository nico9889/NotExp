import * as esbuild from 'esbuild'
import * as fs from 'fs';
import {minify} from "html-minifier-terser";
import {parse} from "node-html-parser";

// Parsing HTML file to populate _locales files
const html = fs.readFileSync("./public/popup.html", {encoding: "utf8"});

const root = parse(html);

const default_translation = new Map();

// Query all the translatable texts
root.querySelectorAll('[nex-i18n]').forEach(el => {
    default_translation.set(el.getAttribute('nex-i18n'), el.innerText);
});

// Populate translations file with missing keys to help translators
function populate_translations(lang_code){
    let file;
    try{
        file = fs.readFileSync(`./_locales/${lang_code}/messages.json`, {encoding: "utf8"});
    }catch (e){
        file = {};
    }


    const missing_keys = [];

    let translations = {};
    try{
        translations = JSON.parse(file);
    }catch(e) {

    }
    // If the language is not english, populate with an empty string.
    // The empty string should be useful for translators as an indication that the translation is missing.
    // Empty strings will be removed later so the browser will fall back to the default language.
    if (lang_code !== 'en') {
        default_translation.forEach((_, key) => {
            if(translations[key] === undefined){
                translations[key] = {message: ""};
                missing_keys.push(key);
            }else if(!translations[key]["message"]){
                missing_keys.push(key);
            }
        });
        if(missing_keys.length > 0){
            console.error(`Language ${lang_code} has missing translation for keys:`, missing_keys.join(", "));
        }
    }
    // If the language is english (the default language) then try to populate with default texts from HTML
    else{
        default_translation.forEach((value, key) => {
            if(translations[key] === undefined){
                // Set the value equal to the HTML text trimmed, with multiple spaces collapsed to one
                translations[key] = {message: value.trim().replace(/\s+/g, ' ')};
                missing_keys.push(key);
            }
        })
        if(missing_keys.length > 0){
            console.error(`Automatically populated strings for ${lang_code}. Keys: `, missing_keys.join(", "));
        }
    }
    fs.writeFileSync(`./_locales/${lang_code}/messages.json`, JSON.stringify(translations, null, 2));
}

// Load each language folder and tries to populate the message.json with missing strings
fs.readdirSync('./_locales/').forEach(lang_code => {
    try{
        // Tests if the folder is a symlink
        fs.readlinkSync(`./_locales/${lang_code}/`);
    }catch(e){
        populate_translations(lang_code);
    }
});


// Remove old dist folder
fs.rmSync('./dist', {recursive: true, force: true});

// Bundling minified JS
await esbuild.build({
    entryPoints: [
        "./src/content.ts",
        "./src/notexp.ts",
    ],
    format: 'esm',
    platform: "browser",
    minify: true,
    bundle: true,
    outdir: "./dist",
});


// Bundling minified CSS
await esbuild.build({
    entryPoints: [
        "./public/popup.css"
    ],
    format: 'esm',
    platform: "browser",
    minify: true,
    bundle: true,
    outdir: "./dist"
});

// Minify and add to bundle HTML
const out = await minify(html, {collapseWhitespace: true, removeComments: true});
fs.writeFileSync("./dist/popup.html", out);

// Exclude already copied CSS and HTML
const exclude_files = ["popup.css", "popup.html"];

// Copy remaining assets files
const files = fs.readdirSync("./public");
files.filter(file => !exclude_files.includes(file)).forEach(file => {
    fs.copyFileSync(`./public/${file}`, `./dist/${file}`);
});

// Create locales folder
if(!fs.existsSync(`./dist/_locales/`)) {
    fs.mkdirSync(`./dist/_locales/`);
}

// Remove untranslated strings from translation files and export to dist folder
fs.readdirSync('./_locales/').forEach(lang_code => {
    const file = fs.readFileSync(`./_locales/${lang_code}/messages.json`, {encoding: "utf8"});
    const translations = JSON.parse(file);
    for(const key in translations) {
        if(translations[key]["message"] === ""){
            translations[key] = undefined;
        }
    }
    if(!fs.existsSync(`./dist/_locales/${lang_code}`)) {
        fs.mkdirSync(`./dist/_locales/${lang_code}`);
    }
    fs.writeFileSync(`./dist/_locales/${lang_code}/messages.json`, JSON.stringify(translations));
});

