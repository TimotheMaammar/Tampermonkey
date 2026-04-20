// ==UserScript==
// @name         LinkedIn Job URL Extractor
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Extrait tous les jobs LinkedIn d'une page
// @author       Timothé Maammar
// @match        https://www.linkedin.com/jobs/*
// @grant        GM_setClipboard
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Crée le bouton flottant
    const floatingBtn = document.createElement('button');
    floatingBtn.id = 'linkedin-extractor-btn';
    floatingBtn.textContent = '🔗 Extract URLs';
    floatingBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #0077B5 0%, #005a87 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0, 119, 181, 0.4);
        transition: all 0.2s;
    `;

    floatingBtn.onmouseover = () => {
        floatingBtn.style.transform = 'scale(1.05)';
        floatingBtn.style.boxShadow = '0 6px 16px rgba(0, 119, 181, 0.6)';
    };
    floatingBtn.onmouseout = () => {
        floatingBtn.style.transform = 'scale(1)';
        floatingBtn.style.boxShadow = '0 4px 12px rgba(0, 119, 181, 0.4)';
    };

    // Fonction : Extraire les jobs
    function extractJobs() {
        const jobs = [];
        const seenUrls = new Set();

        const jobCards = document.querySelectorAll('article, [data-job-id], [class*="job-card"]');

        jobCards.forEach((card) => {
            try {
                const titleEl = card.querySelector('h3, [class*="title"], [class*="job-title"]');
                const title = titleEl?.textContent?.trim() || '';

                const companyEl = card.querySelector('[class*="company"], span[class*="subtitle"]');
                const company = companyEl?.textContent?.trim() || '';

                const locationEl = card.querySelector('[class*="location"]');
                const location = locationEl?.textContent?.trim() || '';

                let url = null;

                const jobLink = card.querySelector('a[href*="/jobs/"]');
                if (jobLink) {
                    url = jobLink.getAttribute('href');
                }

                if (!url) {
                    url = card.getAttribute('data-apply-url');
                }

                if (!url) {
                    const applyBtn = card.querySelector('a[href*="/apply/"], button[aria-label*="Apply"]');
                    if (applyBtn) {
                        url = applyBtn.getAttribute('href') || applyBtn.getAttribute('data-url');
                    }
                }

                if ((title || company) && url && !seenUrls.has(url)) {
                    seenUrls.add(url);
                    jobs.push({
                        title: title || 'Unknown Job',
                        company: company || 'Unknown Company',
                        location: location || '',
                        url: url
                    });
                }
            } catch (e) {
                console.log('Erreur parsing job:', e);
            }
        });

        return jobs;
    }

    // Fonction : Nettoyer l'URL (garder juste /jobs/view/ID)
    function cleanUrl(url) {
        // Cherche /jobs/view/NUMBERS
        const match = url.match(/\/jobs\/view\/(\d+)/);
        if (match) {
            return `/jobs/view/${match[1]}`;
        }
        return url; // Retourne l'original si pas de match
    }

    // Fonction : Afficher la modale
    function showModal(jobs) {
        const oldModal = document.getElementById('linkedin-extractor-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = 'linkedin-extractor-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #0077B5 0%, #005a87 100%);
            color: white;
            padding: 20px;
            border-radius: 10px 10px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <div>
                <h2 style="margin: 0 0 8px 0; font-size: 22px;">🔗 LinkedIn Jobs Found</h2>
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">${jobs.length} jobs extracted</p>
            </div>
        `;

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        `;

        // Copy All Button
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Copy all content';
        copyBtn.style.cssText = `
            padding: 10px 16px;
            background: #e8f1f7;
            color: #0077B5;
            border: 1px solid #d0e4f7;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        `;
        copyBtn.onmouseover = () => copyBtn.style.background = '#d0e4f7';
        copyBtn.onmouseout = () => copyBtn.style.background = '#e8f1f7';
        copyBtn.onclick = () => {
            const allUrls = jobs.map((job, i) => `${i + 1}. ${job.title}\n   Company: ${job.company}\n   URL: ${job.url}`).join('\n\n');
            GM_setClipboard(allUrls);
            alert('✅ Copied to clipboard!');
        };

        // Export CSV Button
        const exportBtn = document.createElement('button');
        exportBtn.textContent = '💾 Export CSV';
        exportBtn.style.cssText = copyBtn.style.cssText;
        exportBtn.onmouseover = () => exportBtn.style.background = '#d0e4f7';
        exportBtn.onmouseout = () => exportBtn.style.background = '#e8f1f7';
        exportBtn.onclick = () => {
            const csv = [
                ['#', 'Job Title', 'Company', 'Location', 'URL'].join(','),
                ...jobs.map((job, idx) => [
                    idx + 1,
                    `"${job.title.replace(/"/g, '""')}"`,
                    `"${job.company.replace(/"/g, '""')}"`,
                    `"${job.location.replace(/"/g, '""')}"`,
                    `"${job.url}"`
                ].join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `linkedin-jobs-${new Date().toISOString().split('T')[0]}.csv`);
            link.click();
            URL.revokeObjectURL(url);
        };

        // ⭐ NEW : Clean Wordlist Button
        const wordlistBtn = document.createElement('button');
        wordlistBtn.textContent = '📝 Clean Wordlist';
        wordlistBtn.style.cssText = `
            padding: 10px 16px;
            background: #f3e5f5;
            color: #7b1fa2;
            border: 1px solid #e1bee7;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        `;
        wordlistBtn.onmouseover = () => wordlistBtn.style.background = '#e1bee7';
        wordlistBtn.onmouseout = () => wordlistBtn.style.background = '#f3e5f5';
        wordlistBtn.onclick = () => showWordlistModal(jobs);

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✖️ Close';
        closeBtn.style.cssText = `
            padding: 10px 16px;
            background: #ffebee;
            color: #d32f2f;
            border: 1px solid #ffcdd2;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.background = '#ffcdd2';
        closeBtn.onmouseout = () => closeBtn.style.background = '#ffebee';
        closeBtn.onclick = () => modal.remove();

        buttonContainer.appendChild(copyBtn);
        buttonContainer.appendChild(exportBtn);
        buttonContainer.appendChild(wordlistBtn);
        buttonContainer.appendChild(closeBtn);

        // Jobs List
        const listContainer = document.createElement('div');
        listContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        `;

        if (jobs.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No jobs found. Try scrolling first!</p>';
        } else {
            jobs.forEach((job, idx) => {
                const jobEl = document.createElement('div');
                jobEl.style.cssText = `
                    background: #f9f9f9;
                    border: 1px solid #e0e0e0;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 10px;
                    transition: all 0.2s;
                `;
                jobEl.onmouseover = () => jobEl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                jobEl.onmouseout = () => jobEl.style.boxShadow = 'none';

                jobEl.innerHTML = `
                    <div style="margin-bottom: 8px;">
                        <span style="display: inline-block; background: #0077B5; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-right: 8px;">#${idx + 1}</span>
                        <span style="font-weight: 600; color: #333;">${job.title}</span>
                    </div>
                    <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                        <strong>${job.company}</strong> ${job.location ? '• ' + job.location : ''}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" value="${job.url}" readonly style="flex: 1; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; font-family: monospace; background: #fafafa;">
                        <button class="copy-url-btn" style="padding: 6px 10px; background: #e8f1f7; border: 1px solid #d0e4f7; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">📋</button>
                    </div>
                `;

                const copyBtn = jobEl.querySelector('.copy-url-btn');
                copyBtn.onclick = () => {
                    GM_setClipboard(job.url);
                    alert('✅ URL copied!');
                };

                listContainer.appendChild(jobEl);
            });
        }

        content.appendChild(header);
        content.appendChild(buttonContainer);
        content.appendChild(listContainer);
        modal.appendChild(content);

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.body.appendChild(modal);
    }

    // ⭐ NEW : Modale Wordlist
    function showWordlistModal(jobs) {
        const oldWordlistModal = document.getElementById('linkedin-wordlist-modal');
        if (oldWordlistModal) oldWordlistModal.remove();

        const modal = document.createElement('div');
        modal.id = 'linkedin-wordlist-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #7b1fa2 0%, #5a0e78 100%);
            color: white;
            padding: 20px;
            border-radius: 10px 10px 0 0;
        `;
        header.innerHTML = `
            <h2 style="margin: 0 0 8px 0; font-size: 22px;">📝 Clean Wordlist</h2>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Cleaned URLs ready to parse</p>
        `;

        // Textarea
        const textarea = document.createElement('textarea');
        const cleanedUrls = jobs.map(job => cleanUrl(job.url)).join('\n');
        textarea.value = cleanedUrls;
        textarea.style.cssText = `
            flex: 1;
            padding: 16px;
            border: none;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            resize: none;
        `;
        textarea.readOnly = true;

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            padding: 16px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            gap: 10px;
        `;

        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Copy Wordlist';
        copyBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: #7b1fa2;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        `;
        copyBtn.onmouseover = () => copyBtn.style.background = '#5a0e78';
        copyBtn.onmouseout = () => copyBtn.style.background = '#7b1fa2';
        copyBtn.onclick = () => {
            GM_setClipboard(cleanedUrls);
            alert('✅ Wordlist copied!');
        };

        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '💾 Download TXT';
        downloadBtn.style.cssText = copyBtn.style.cssText;
        downloadBtn.style.background = '#f3e5f5';
        downloadBtn.style.color = '#7b1fa2';
        downloadBtn.onmouseover = () => downloadBtn.style.background = '#e1bee7';
        downloadBtn.onmouseout = () => downloadBtn.style.background = '#f3e5f5';
        downloadBtn.onclick = () => {
            const blob = new Blob([cleanedUrls], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `linkedin-wordlist-${new Date().toISOString().split('T')[0]}.txt`;
            link.click();
            URL.revokeObjectURL(url);
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✖️ Close';
        closeBtn.style.cssText = `
            padding: 12px 20px;
            background: #ffebee;
            color: #d32f2f;
            border: 1px solid #ffcdd2;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
        `;
        closeBtn.onclick = () => modal.remove();

        buttonContainer.appendChild(copyBtn);
        buttonContainer.appendChild(downloadBtn);
        buttonContainer.appendChild(closeBtn);

        content.appendChild(header);
        content.appendChild(textarea);
        content.appendChild(buttonContainer);
        modal.appendChild(content);

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.body.appendChild(modal);
    }

    // Click listener
    floatingBtn.onclick = () => {
        floatingBtn.disabled = true;
        floatingBtn.textContent = '⏳ Extracting...';

        setTimeout(() => {
            const jobs = extractJobs();
            showModal(jobs);
            floatingBtn.disabled = false;
            floatingBtn.textContent = '🔗 Extract URLs';
        }, 500);
    };

    document.body.appendChild(floatingBtn);
    console.log('✅ LinkedIn Job Extractor loaded!');
})();
