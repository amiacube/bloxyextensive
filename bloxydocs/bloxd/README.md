# Bloxd

Projet pour la R5.06 (Symfony). C'est un peu Letterboxd mais pour les jeux Roblox : on note les jeux sur 5, on laisse un avis, et chacun a sa page avec ses avis.

Les infos des jeux (image, description, nombre de joueurs...) viennent de l'API de Roblox, voir `src/Service/RobloxApi.php`. On peut aussi chercher n'importe quel jeu Roblox depuis le site et l'ajouter au catalogue.

## Lancer le projet

```
composer install
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
php bin/console doctrine:fixtures:load
php bin/console app:roblox:sync      # récupère les images et stats (optionnel)
symfony server:start
```

Il faut mettre son DATABASE_URL dans `.env.local`.

## Comptes de test

- admin@bloxd.fr / admin (admin)
- alice@bloxd.fr / alice, bob@bloxd.fr / bob, chloe@bloxd.fr / chloe ... (joueurs)

## Routes JSON (admin)

- GET /admin/api/stats
- GET /admin/api/top-jeux
- GET /admin/api/avis et DELETE /admin/api/avis/{id}
- GET /admin/api/utilisateurs et POST /admin/api/utilisateurs/{id}/admin
- POST /admin/api/jeux/sync et POST /admin/api/jeux/{id}/sync
