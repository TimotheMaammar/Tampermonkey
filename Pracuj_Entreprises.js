// ==UserScript==
// @name         Pracuj.pl - Company names
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Récupère les noms des entreprises sur les pages contenant des offres
// @author       Timothé Maammar
// @match        https://*.pracuj.pl/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function scrapeCompanies() {
        const companies = new Set(); // Set pour éviter les doublons

        // Sélecteur exact trouvé dans le HTML
        document.querySelectorAll('[data-test="text-company-name"]').forEach(el => {
            const company = el.textContent.trim();
            if (company.length > 0) {
                companies.add(company);
            }
        });

        return Array.from(companies).sort();
    }

    function showResults() {
        const companies = scrapeCompanies();

        if (companies.length === 0) {
            alert('❌ Aucune entreprise trouvée. Check les sélecteurs CSS!');
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'companies-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #0066cc;
            border-radius: 8px;
            padding: 20px;
            z-index: 10000;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
        `;

        const content = `
            <h2 style="margin-top: 0; color: #0066cc;">🏢 Entreprises trouvées: ${companies.length}</h2>
            <p><strong>Copier:</strong>
                <button id="copy-json" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">JSON</button>
                <button id="copy-csv" style="padding: 5px 10px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 5px;">CSV</button>
                <button id="copy-list" style="padding: 5px 10px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 5px;">Liste</button>
            </p>
            <textarea id="companies-output" style="width: 100%; height: 400px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 12px;"></textarea>
            <button id="close-modal" style="width: 100%; padding: 10px; margin-top: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Fermer</button>
        `;

        modal.innerHTML = content;
        document.body.appendChild(modal);

        const textarea = document.getElementById('companies-output');
        textarea.value = JSON.stringify(companies, null, 2);

        document.getElementById('copy-json').addEventListener('click', () => {
            textarea.value = JSON.stringify(companies, null, 2);
            textarea.select();
            document.execCommand('copy');
            alert('✅ JSON copié!');
        });

        document.getElementById('copy-csv').addEventListener('click', () => {
            const csv = 'Entreprise\n' + companies.map(c => `"${c}"`).join('\n');
            textarea.value = csv;
            textarea.select();
            document.execCommand('copy');
            alert('✅ CSV copié!');
        });

        document.getElementById('copy-list').addEventListener('click', () => {
            const list = companies.join('\n');
            textarea.value = list;
            textarea.select();
            document.execCommand('copy');
            alert('✅ Liste copie!');
        });

        document.getElementById('close-modal').addEventListener('click', () => {
            modal.remove();
        });
    }

    function createButton() {
        const button = document.createElement('button');
        button.id = 'scrape-button';
        button.textContent = '🏢 Scrape companies';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            z-index: 9999;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        button.addEventListener('click', showResults);
        button.addEventListener('mouseover', () => button.style.background = '#0052a3');
        button.addEventListener('mouseout', () => button.style.background = '#0066cc');

        document.body.appendChild(button);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createButton);
    } else {
        createButton();
    }
})();
