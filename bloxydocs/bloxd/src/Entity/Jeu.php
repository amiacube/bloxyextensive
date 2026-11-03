<?php

namespace App\Entity;

use App\Repository\JeuRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: JeuRepository::class)]
class Jeu
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    private ?string $titre = null;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    private ?string $studio = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank]
    private ?string $description = null;

    #[ORM\Column]
    #[Assert\Range(min: 2006, max: 2030)]
    private ?int $anneeSortie = null;

    #[ORM\Column(length: 7)]
    #[Assert\CssColor(formats: Assert\CssColor::HEX_LONG)]
    private string $couleur = '#e2231a';

    #[ORM\ManyToOne(inversedBy: 'jeux')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Genre $genre = null;

    // id dans l'url roblox.com/games/XXXX
    #[ORM\Column(type: Types::BIGINT, nullable: true)]
    private ?int $placeId = null;

    #[ORM\Column(type: Types::BIGINT, nullable: true)]
    private ?int $universeId = null;

    // icône carrée
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $imageUrl = null;

    // vignette 16:9
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $vignetteUrl = null;

    #[ORM\Column(nullable: true)]
    private ?int $joueursEnLigne = null;

    #[ORM\Column(type: Types::BIGINT, nullable: true)]
    private ?int $visites = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $majRoblox = null;

    /**
     * @var Collection<int, Avis>
     */
    #[ORM\OneToMany(targetEntity: Avis::class, mappedBy: 'jeu', orphanRemoval: true)]
    #[ORM\OrderBy(['creeLe' => 'DESC'])]
    private Collection $avis;

    public function __construct()
    {
        $this->avis = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitre(): ?string
    {
        return $this->titre;
    }

    public function setTitre(string $titre): static
    {
        $this->titre = $titre;

        return $this;
    }

    public function getStudio(): ?string
    {
        return $this->studio;
    }

    public function setStudio(string $studio): static
    {
        $this->studio = $studio;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getAnneeSortie(): ?int
    {
        return $this->anneeSortie;
    }

    public function setAnneeSortie(int $anneeSortie): static
    {
        $this->anneeSortie = $anneeSortie;

        return $this;
    }

    public function getCouleur(): string
    {
        return $this->couleur;
    }

    public function setCouleur(string $couleur): static
    {
        $this->couleur = $couleur;

        return $this;
    }

    public function getGenre(): ?Genre
    {
        return $this->genre;
    }

    public function setGenre(?Genre $genre): static
    {
        $this->genre = $genre;

        return $this;
    }

    public function getPlaceId(): ?int
    {
        return $this->placeId;
    }

    public function setPlaceId(?int $placeId): static
    {
        $this->placeId = $placeId;

        return $this;
    }

    public function getUniverseId(): ?int
    {
        return $this->universeId;
    }

    public function setUniverseId(?int $universeId): static
    {
        $this->universeId = $universeId;

        return $this;
    }

    public function getImageUrl(): ?string
    {
        return $this->imageUrl;
    }

    public function setImageUrl(?string $imageUrl): static
    {
        $this->imageUrl = $imageUrl;

        return $this;
    }

    public function getVignetteUrl(): ?string
    {
        return $this->vignetteUrl;
    }

    public function setVignetteUrl(?string $vignetteUrl): static
    {
        $this->vignetteUrl = $vignetteUrl;

        return $this;
    }

    public function getJoueursEnLigne(): ?int
    {
        return $this->joueursEnLigne;
    }

    public function setJoueursEnLigne(?int $joueursEnLigne): static
    {
        $this->joueursEnLigne = $joueursEnLigne;

        return $this;
    }

    public function getVisites(): ?int
    {
        return $this->visites;
    }

    public function setVisites(?int $visites): static
    {
        $this->visites = $visites;

        return $this;
    }

    public function getMajRoblox(): ?\DateTimeImmutable
    {
        return $this->majRoblox;
    }

    public function setMajRoblox(?\DateTimeImmutable $majRoblox): static
    {
        $this->majRoblox = $majRoblox;

        return $this;
    }

    public function getUrlRoblox(): ?string
    {
        return $this->placeId ? 'https://www.roblox.com/games/'.$this->placeId : null;
    }

    /**
     * @return Collection<int, Avis>
     */
    public function getAvis(): Collection
    {
        return $this->avis;
    }

    public function getAvisDe(User $user): ?Avis
    {
        foreach ($this->avis as $avis) {
            if ($avis->getAuteur() === $user) {
                return $avis;
            }
        }

        return null;
    }

    public function getNoteMoyenne(): ?float
    {
        if ($this->avis->isEmpty()) {
            return null;
        }
        $total = 0;
        foreach ($this->avis as $avis) {
            $total += $avis->getNote();
        }

        return round($total / $this->avis->count(), 1);
    }

    // note => nombre d'avis, pour l'histogramme
    public function getRepartition(): array
    {
        $repartition = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
        foreach ($this->avis as $avis) {
            $repartition[$avis->getNote()]++;
        }

        return $repartition;
    }

    public function getInitiales(): string
    {
        $mots = preg_split('/\s+/', trim((string) $this->titre));
        $initiales = '';
        foreach (array_slice($mots, 0, 2) as $mot) {
            $initiales .= mb_strtoupper(mb_substr($mot, 0, 1));
        }

        return $initiales;
    }

    public function __toString(): string
    {
        return (string) $this->titre;
    }
}
