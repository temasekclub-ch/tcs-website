# Setting up the content sheet, the contact form and the website

This is a one-time job for whoever hands the website over. Allow about 45 minutes. You need:

- the club's Google account, **temasekclub.ch@gmail.com** (it will own the sheet and the script)
- a GitHub account for the club (ideally an organisation, so the site does not depend on one person)

When you are done, the club's editors only ever open the Google Sheet. They never touch GitHub or the code.

---

## 1. Create the Google Sheet

1. Sign in to Google as **temasekclub.ch@gmail.com**.
2. Open <https://sheets.new> and name the file **TCS website content**.
3. Share it (Share button, top right) with the 2 to 5 editors as **Editor**. The sheet itself does not need "anyone with the link"; the script reads it on behalf of the club.

## 2. Add the script

1. In the sheet choose **Extensions > Apps Script**. A new tab opens.
2. Delete the little bit of code that is already there.
3. Open `apps-script/Code.gs` from this project, copy **everything**, and paste it into the editor.
4. Click the disk icon (Save). Name the project **TCS website**.
5. In the toolbar choose the function **setupSheet** from the dropdown, then click **Run**.
6. Google asks for permission. Click **Review permissions**, choose the club account, then **Advanced > Go to TCS website (unsafe) > Allow**. (The "unsafe" warning appears for every script that has not been through Google's public review. It is the club's own script.) The permissions are:
   - view and edit the spreadsheet it is attached to (to read the content and save messages)
   - send email as the club account (to deliver the contact form)
7. Go back to the sheet tab. It now has these tabs, with example rows already in them: **README, Team, Sponsors, Local Businesses, Events, Past Events, AGM Docs, Home Carousel, Home Event Photos, Home Partners, About, Life Tips, Settings, Messages**.

A new menu **TCS website** also appears (reload the sheet if it does not). It has *Check my content for problems*, which the editors can use any time.

## 3. Publish the script as the website's data address

1. In the Apps Script tab click **Deploy > New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - Description: `Website`
   - Execute as: **Me (temasekclub.ch@gmail.com)**
   - Who has access: **Anyone**
4. Click **Deploy** and allow access if asked.
5. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfycb.../exec`.
6. Test it: open that URL in a browser and add `?action=content` at the end. You should see a long block of text starting with `{"ok":true`. That is the content the website reads. If you see a Google sign-in page instead, the access setting in step 3 is not "Anyone".

## 4. Put the website on GitHub Pages

1. On GitHub create a new repository, for example `tcs-website`. It must be **public** for the free GitHub Pages plan.
2. Upload everything in this project to the repository (drag the files and folders into the page, or use `git`). The file `index.html` must be at the top level.
3. Open `config.js` in the repository, click the pencil icon, and paste the Web app URL between the quotes after `api:`. Save (commit).
4. In the repository choose **Settings > Pages**. Under "Build and deployment" choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.
5. After a minute GitHub shows the website address, for example `https://yourclub.github.io/tcs-website/`. Open it.

Optional: under Settings > Pages you can enter a custom domain (such as `singaporeans.ch`) and follow GitHub's instructions to point the domain's DNS at GitHub.

## 5. Test everything

1. **Content:** open the website. Change a name in the Team tab, reload the website (hold Shift and click reload). The new name should appear.
2. **Contact form:** use a "Join us" form on any page. Within a minute a message should arrive at temasekclub.ch@gmail.com, and a row should appear in the **Messages** tab. The visitor's address is the reply-to, so Reply goes to them.
3. **Problems:** run **TCS website > Check my content for problems** in the sheet.

## 6. Replace the example content

The example rows show photos from the website's own `assets` folder. Replace them with real content at your own pace, as described in `docs/EDITOR-GUIDE.md`. Photos should move to the club's Google Drive.

Good Drive habit: make one folder called **TCS website photos**, share it as **Anyone with the link can view**, and keep every photo in there.

---

## Changing the script later

Editing the sheet never needs any of this. But if the script code itself is changed:

1. Paste the new code into the Apps Script editor and save.
2. **Deploy > Manage deployments > pencil icon > Version: New version > Deploy.** The address stays the same. Without a new version the website keeps running the old code.

## Changing where messages go

Open the script and change `RECIPIENT` at the top of `Code.gs` (`CONFIG`). Save and deploy a new version.

## If something goes wrong

| What you see | Likely cause and fix |
|---|---|
| Website shows old content or the example content | `api` in `config.js` is empty or wrong. Open the Web app URL with `?action=content` to check it. |
| `?action=content` shows a Google sign-in page | The deployment's access is not "Anyone". Redeploy as in step 3. |
| `?action=content` shows `{"ok":false,...}` | The message says what is wrong, usually a renamed tab. |
| A row does not appear | Show is unticked, the required column (such as Name) is empty, or the tab or header names were changed. Run *Check my content for problems*. |
| A photo shows a grey placeholder | The Drive file is not shared with "Anyone with the link", or the link is for a folder. |
| The form says it could not send | Open the Messages tab: the Status column shows the reason. The club's Gmail may have reached its daily sending limit (about 100 a day). |
| Changes take a while to show | Browsers keep a saved copy and refresh it in the background. Reload once more, or hold Shift while reloading. |

## Limits worth knowing

- Google limits how long a script may run per day and how many people can call it at the same moment. A club website is far below those limits. If a sudden rush ever slows it, visitors still see the last saved copy of the content.
- A normal Gmail account can send about 100 emails a day through a script, which is far more than the contact form will need.
- The data address is public. Anyone who knows it can read the sheet's content. Do not put private information in the sheet.
- GitHub Pages keeps files for up to 10 minutes. If a code file changes, bump the `?v=` number at the end of its name in each page, or wait.
