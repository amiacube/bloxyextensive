<?php

namespace App\Service;

use App\Entity\Jeu;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

// API web de Roblox, celles que le site roblox.com utilise lui-même. Pas de clé.
class RobloxApi
{
    public function __construct(private HttpClientInterface $client)
    {
    }

    public function extrairePlaceId(string $saisie): ?int
    {
        $saisie = trim($saisie);
        if (preg_match('/games\/(\d+)/', $saisie, $m)) {
            return (int) $m[1];
        }
        if (ctype_digit($saisie)) {
            return (int) $saisie;
        }

        return null;
    }

    public function universeId(int $placeId): ?int
    {
        try {
            $data = $this->client->request('GET', "https://apis.roblox.com/universes/v1/places/{$placeId}/universe")->toArray();
        } catch (ExceptionInterface) {
            return null;
        }

        return $data['universeId'] ?? null;
    }

    // universeId => infos brutes de l'API (nom, créateur, joueurs, visites...)
    public function infos(array $universeIds): array
    {
        if ($universeIds === []) {
            return [];
        }
        try {
            $data = $this->client->request('GET', 'https://games.roblox.com/v1/games', [
                'query' => ['universeIds' => implode(',', $universeIds)],
            ])->toArray();
        } catch (ExceptionInterface) {
            return [];
        }

        $result = [];
        foreach ($data['data'] ?? [] as $jeu) {
            $result[(int) $jeu['id']] = $jeu;
        }

        return $result;
    }

    // universeId => url de l'icône carrée
    public function icones(array $universeIds): array
    {
        if ($universeIds === []) {
            return [];
        }
        try {
            $data = $this->client->request('GET', 'https://thumbnails.roblox.com/v1/games/icons', [
                'query' => [
                    'universeIds' => implode(',', $universeIds),
                    'size' => '512x512',
                    'format' => 'Png',
                    'returnPolicy' => 'PlaceHolder',
                ],
            ])->toArray();
        } catch (ExceptionInterface) {
            return [];
        }

        $result = [];
        foreach ($data['data'] ?? [] as $icone) {
            if (($icone['state'] ?? '') === 'Completed' && !empty($icone['imageUrl'])) {
                $result[(int) $icone['targetId']] = $icone['imageUrl'];
            }
        }

        return $result;
    }

    // universeId => url de la première vignette 16:9
    public function vignettes(array $universeIds): array
    {
        if ($universeIds === []) {
            return [];
        }
        try {
            $data = $this->client->request('GET', 'https://thumbnails.roblox.com/v1/games/multiget/thumbnails', [
                'query' => [
                    'universeIds' => implode(',', $universeIds),
                    'size' => '768x432',
                    'format' => 'Png',
                    'countPerUniverse' => 1,
                ],
            ])->toArray();
        } catch (ExceptionInterface) {
            return [];
        }

        $result = [];
        foreach ($data['data'] ?? [] as $jeu) {
            $vignette = $jeu['thumbnails'][0] ?? null;
            if ($vignette && ($vignette['state'] ?? '') === 'Completed' && !empty($vignette['imageUrl'])) {
                $result[(int) $jeu['universeId']] = $vignette['imageUrl'];
            }
        }

        return $result;
    }

    // recherche comme sur le site roblox, renvoie une liste de jeux (placeId, nom, joueurs, icone, vignette...)
    public function rechercher(string $q, int $limite = 12): array
    {
        try {
            $data = $this->client->request('GET', 'https://apis.roblox.com/search-api/omni-search', [
                'query' => ['searchQuery' => $q, 'sessionId' => bin2hex(random_bytes(8)), 'pageType' => 'all'],
            ])->toArray();
        } catch (ExceptionInterface) {
            return [];
        }

        $resultats = [];
        foreach ($data['searchResults'] ?? [] as $groupe) {
            foreach ($groupe['contents'] ?? [] as $c) {
                if (($c['contentType'] ?? '') !== 'Game' || empty($c['rootPlaceId'])) {
                    continue;
                }
                $resultats[(int) $c['universeId']] = [
                    'universeId' => (int) $c['universeId'],
                    'placeId' => (int) $c['rootPlaceId'],
                    'nom' => $this->nettoyerTitre($c['name'] ?? ''),
                    'joueurs' => (int) ($c['playerCount'] ?? 0),
                    'votes' => (int) ($c['totalUpVotes'] ?? 0),
                    'icone' => null,
                    'vignette' => null,
                ];
                if (count($resultats) >= $limite) {
                    break 2;
                }
            }
        }

        foreach ($this->icones(array_keys($resultats)) as $universeId => $url) {
            $resultats[$universeId]['icone'] = $url;
        }
        foreach ($this->vignettes(array_keys($resultats)) as $universeId => $url) {
            $resultats[$universeId]['vignette'] = $url;
        }

        return array_values($resultats);
    }

    // remplit le jeu depuis roblox, renvoie les infos brutes (pour le genre) ou null si le jeu n'existe pas
    public function importer(Jeu $jeu, int $placeId): ?array
    {
        $universeId = $this->universeId($placeId);
        if ($universeId === null) {
            return null;
        }
        $infos = $this->infos([$universeId])[$universeId] ?? null;
        if ($infos === null) {
            return null;
        }

        $jeu->setPlaceId($placeId)
            ->setUniverseId($universeId)
            ->setTitre(mb_substr($this->nettoyerTitre($infos['name']), 0, 100))
            ->setStudio(mb_substr($infos['creator']['name'] ?? 'Inconnu', 0, 100))
            ->setDescription($infos['description'] ?: 'Pas de description.')
            ->setAnneeSortie((int) (new \DateTimeImmutable($infos['created']))->format('Y'));

        $this->appliquerStats($jeu, $infos, $this->icones([$universeId])[$universeId] ?? null, $this->vignettes([$universeId])[$universeId] ?? null);

        return $infos;
    }

    public function genreFrancais(?string $genreRoblox): string
    {
        return match ($genreRoblox) {
            'Roleplay & Avatar Sim', 'Social' => 'Roleplay',
            'Simulation' => 'Simulateur',
            'Horror' => 'Horreur',
            'Action', 'Shooter' => 'Combat',
            'Obby & Platformer' => 'Obby',
            'Survival' => 'Survie',
            'Adventure', 'RPG' => 'Aventure',
            'Party & Casual', 'Puzzle' => 'Mini-jeux',
            'Strategy', 'Shopping' => 'Tycoon',
            null, '' => 'Autre',
            default => $genreRoblox,
        };
    }

    // met à jour image, joueurs en ligne et visites, par lots de 50 ; ne touche pas au titre ni à la description
    public function synchroniser(array $jeux): int
    {
        $parUniverse = [];
        foreach ($jeux as $jeu) {
            if ($jeu->getPlaceId() === null) {
                continue;
            }
            if ($jeu->getUniverseId() === null) {
                $universeId = $this->universeId($jeu->getPlaceId());
                if ($universeId === null) {
                    continue;
                }
                $jeu->setUniverseId($universeId);
            }
            $parUniverse[$jeu->getUniverseId()] = $jeu;
        }

        $nb = 0;
        foreach (array_chunk(array_keys($parUniverse), 50) as $lot) {
            $infos = $this->infos($lot);
            $icones = $this->icones($lot);
            $vignettes = $this->vignettes($lot);
            foreach ($lot as $universeId) {
                if (!isset($infos[$universeId])) {
                    continue;
                }
                $this->appliquerStats($parUniverse[$universeId], $infos[$universeId], $icones[$universeId] ?? null, $vignettes[$universeId] ?? null);
                $nb++;
            }
        }

        return $nb;
    }

    private function appliquerStats(Jeu $jeu, array $infos, ?string $icone, ?string $vignette): void
    {
        $jeu->setJoueursEnLigne($infos['playing'] ?? null)
            ->setVisites($infos['visits'] ?? null)
            ->setMajRoblox(new \DateTimeImmutable());
        if ($icone !== null) {
            $jeu->setImageUrl($icone);
        }
        if ($vignette !== null) {
            $jeu->setVignetteUrl($vignette);
        }
    }

    // enlève les [UPDATE] et les émojis des titres Roblox
    public function nettoyerTitre(string $titre): string
    {
        $titre = preg_replace('/\[[^\]]*\]/u', '', $titre);
        $titre = preg_replace('/[^\p{L}\p{N}\s\'!?:.\-&]/u', '', $titre);

        return trim(preg_replace('/\s+/', ' ', $titre)) ?: 'Sans titre';
    }
}
