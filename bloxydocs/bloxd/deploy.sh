#!/usr/bin/env bash
#
# Prépare un dossier prêt à être envoyé sur le serveur de prod.
#
#   bash deploy.sh                    → dossier ../bloxd_prod
#   bash deploy.sh /chemin/vers/prod  → dossier au choix
#
# Les infos de prod (DATABASE_URL, MAILER_DSN, ROUTE_PREFIX...) se mettent dans
# .env.prod.local (ignoré par git) : `composer dump-env prod` les lit en priorité.

set -euo pipefail   # s'arrête à la première erreur

cd "$(dirname "$0")"
SRC=$(pwd)
DEST=${1:-../bloxd_prod}

# .env.local.php est lu en priorité sur tous les .env : s'il traîne dans le projet
# de dev, le site local tourne en prod. On refuse de continuer plutôt que l'écraser.
if [[ -f .env.local.php ]]; then
    echo "ERREUR : .env.local.php existe déjà dans le projet de dev ($SRC)."
    echo "Supprime-le (rm .env.local.php), sinon ton site local tourne en prod."
    exit 1
fi

if [[ ! -f .env.prod.local ]]; then
    echo "ATTENTION : pas de .env.prod.local, la prod utilisera les valeurs par défaut de .env"
    echo "            (DATABASE_URL avec !ChangeMe!, MAILER_DSN=null://null...)."
    read -rp "Continuer quand même ? [o/N] " reponse
    [[ $reponse == [oO] ]] || exit 1
fi

echo "==> Copie des fichiers vers $DEST"
mkdir -p "$DEST"
# --delete : supprime dans la prod les fichiers qu'on a supprimés en dev
# public/assets : assets compilés, régénérés plus bas dans la prod
rsync -a --delete \
    --exclude 'public/assets/' \
    assets bin config public src templates \
    composer.json composer.lock importmap.php symfony.lock \
    "$DEST/"

echo "==> Génération de .env.local.php (config de prod)"
composer dump-env prod
# On le déplace aussitôt : il ne doit jamais rester dans le projet de dev
mv .env.local.php "$DEST/.env.local.php"

cd "$DEST"

echo "==> Dépendances PHP de prod uniquement (pas de faker, fixtures, maker...)"
APP_ENV=prod composer install --no-dev --optimize-autoloader --no-interaction

echo "==> Assets (importmap)"
php bin/console importmap:install
php bin/console asset-map:compile

echo "==> Cache de prod"
php bin/console cache:clear --env=prod
php bin/console cache:warmup --env=prod

echo
echo "OK : $(pwd) est prêt à être envoyé sur le serveur."
echo "Sur le serveur, pense à : php bin/console doctrine:migrations:migrate --no-interaction"
echo "                        php bin/console doctrine:fixtures:load -n   (optionnel, 1re fois)"
echo "                        php bin/console app:roblox:sync"
