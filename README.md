# Personal Website

A minimalist static personal site — eggshell-white, three pages: Home, Readings, Contact.
Plain HTML + CSS, no build step, no dependencies.

```
index.html      Home
readings.html   Readings (list of books/articles)
contact.html    Contact
style.css       shared styles
```

## Edit it

Open the `.html` files in any text editor. Replace every `[BRACKETED]` placeholder:
- `[YOUR NAME]`, `[Short bio …]`, `[YEAR]` etc.
- On `readings.html`, copy a `<li>…</li>` block for each new book/article.
- On `contact.html`, set the `href="#"` links to your real profile URLs.

Colors live at the top of `style.css` under `:root` (e.g. `--accent` for the small square).

## Preview locally

Just double-click `index.html` to open it in your browser. Or run a local server:

```bash
cd "personal website"
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to a domain

All of these host static files for free and let you attach a custom domain you buy:

**Cloudflare Pages / Netlify / Vercel (drag-and-drop)**
1. Make an account.
2. Create a new project and drag this folder into the upload area (or connect a GitHub repo
   containing these files).
3. No build command needed — it's static. Set the output/publish directory to this folder.
4. In the project's **Domains** settings, add your purchased domain and follow the DNS
   instructions (update the nameservers or add the CNAME/A records they show you).

**GitHub Pages**
1. Push these files to a GitHub repo.
2. Settings → Pages → deploy from the `main` branch, root folder.
3. Add your custom domain under Settings → Pages → Custom domain, then point your domain's
   DNS at GitHub's servers per their instructions.

Tip: rename the folder to something without a space (e.g. `personal-website`) before pushing
to git — it avoids quoting issues.
