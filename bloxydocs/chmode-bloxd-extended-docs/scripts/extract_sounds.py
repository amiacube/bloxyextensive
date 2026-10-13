import os
import json
import requests
from pydub import AudioSegment


SOUND_DATA = {
    'gunSemiAutomatic': r'''{"src":["\\sounds\\generatedSprites\\gunSemiAutomatic.ogg","\\sounds\\generatedSprites\\gunSemiAutomatic.m4a","\\sounds\\generatedSprites\\gunSemiAutomatic.mp3","\\sounds\\generatedSprites\\gunSemiAutomatic.ac3"],"sprite":{"semiAuto_cock_01":[0,500],"semiAuto_cock_02":[2000,548.5714285714284],"semiAuto_cock_03":[4000,500],"semiAuto_cock_04":[6000,522.4489795918367],"semiAuto_cock_05":[8000,500],"semiAuto_first_shot_01":[10000,500],"semiAuto_magazine_load_01":[12000,548.571428571428],"semiAuto_magazine_load_02":[14000,500],"semiAuto_magazine_load_03":[16000,548.571428571428],"semiAuto_magazine_load_04":[18000,500],"semiAuto_magazine_load_05":[20000,500],"semiAuto_magazine_unload_01":[22000,500],"semiAuto_magazine_unload_02":[24000,500],"semiAuto_magazine_unload_03":[26000,500],"semiAuto_magazine_unload_04":[28000,500],"semiAuto_shot_01":[30000,500],"semiAuto_shot_02":[32000,500],"semiAuto_shot_03":[34000,500],"semiAuto_shot_04":[36000,500],"semiAuto_shot_05":[38000,500],"semiAuto_shot_06":[40000,500],"semiAuto_shot_07":[42000,500],"semiAuto_shot_08":[44000,500],"semiAuto_tail_only_shot_01":[46000,2455.5102040816337]}}''',
    'gunSubmachineGun': r'''{"src":["\\sounds\\generatedSprites\\gunSubmachineGun.ogg","\\sounds\\generatedSprites\\gunSubmachineGun.m4a","\\sounds\\generatedSprites\\gunSubmachineGun.mp3","\\sounds\\generatedSprites\\gunSubmachineGun.ac3"],"sprite":{"submachine_cock_01":[0,500],"submachine_cock_02":[2000,500],"submachine_cock_03":[4000,500],"submachine_cock_04":[6000,500],"submachine_first_shot_01":[8000,500],"submachine_magazine_load_01":[10000,500],"submachine_magazine_load_02":[12000,500],"submachine_magazine_load_03":[14000,500],"submachine_magazine_load_04":[16000,500],"submachine_magazine_unload_01":[18000,500],"submachine_magazine_unload_02":[20000,500],"submachine_magazine_unload_03":[22000,500],"submachine_shot_01":[24000,500],"submachine_shot_02":[26000,500],"submachine_shot_03":[28000,500],"submachine_shot_04":[30000,500],"submachine_shot_05":[32000,500],"submachine_shot_06":[34000,500],"submachine_shot_07":[36000,500],"submachine_shot_08":[38000,500],"submachine_shot_09":[40000,500],"submachine_tail_only_shot_01":[42000,1858.820861678005]}}''',
    'gunPistol': r'''{"src":["\\sounds\\generatedSprites\\gunPistol.ogg","\\sounds\\generatedSprites\\gunPistol.m4a","\\sounds\\generatedSprites\\gunPistol.mp3","\\sounds\\generatedSprites\\gunPistol.ac3"],"sprite":{"pistol_cock_01":[0,510],"pistol_cock_02":[2000,500],"pistol_cock_03":[4000,500],"pistol_cock_06":[6000,500],"pistol_magazine_load_01":[8000,500],"pistol_magazine_load_02":[10000,500],"pistol_magazine_load_03":[12000,500],"pistol_magazine_unload_01":[14000,500],"pistol_magazine_unload_02":[16000,500],"pistol_magazine_unload_03":[18000,500],"pistol_shot_01":[20000,1500],"pistol_shot_02":[23000,1569.5918367346949],"pistol_shot_03":[26000,1735.8956916099758],"pistol_shot_04":[29000,1526.7120181405894],"pistol_shot_05":[32000,1442.2222222222204]}}''',
    'gunRifle': r'''{"src":["\\sounds\\generatedSprites\\gunRifle.ogg","\\sounds\\generatedSprites\\gunRifle.m4a","\\sounds\\generatedSprites\\gunRifle.mp3","\\sounds\\generatedSprites\\gunRifle.ac3"],"sprite":{"rifle_cock_01":[0,705.3061224489796],"rifle_cock_02":[2000,1149.3877551020407],"rifle_magazine_load_01":[5000,500],"rifle_magazine_load_02":[7000,500],"rifle_magazine_load_03":[9000,500],"rifle_magazine_unload_01":[11000,500],"rifle_magazine_unload_02":[13000,500],"rifle_magazine_unload_04":[15000,500],"rifle_shot_01":[17000,2115.9183673469392],"rifle_shot_02":[21000,2429.3877551020414],"rifle_shot_03":[25000,2298.775510204081],"rifle_shot_04":[29000,2481.632653061226]}}''',
    'gunMisc': r'''{"src":["\\sounds\\generatedSprites\\gunMisc.ogg","\\sounds\\generatedSprites\\gunMisc.m4a","\\sounds\\generatedSprites\\gunMisc.mp3","\\sounds\\generatedSprites\\gunMisc.ac3"],"sprite":{"bullet_shell_bounce_general_07":[0,823.0612244897959],"bullet_shell_bounce_general_08":[2000,907.0294784580497],"headshot_04":[4000,500],"headshot_06":[6000,500],"headshot_08":[8000,500],"headshot_11":[10000,500]}}''',
    'gunShotgun': r'''{"src":["\\sounds\\generatedSprites\\gunShotgun.ogg","\\sounds\\generatedSprites\\gunShotgun.m4a","\\sounds\\generatedSprites\\gunShotgun.mp3","\\sounds\\generatedSprites\\gunShotgun.ac3"],"sprite":{"shotgun_cock_01":[0,914.2857142857142],"shotgun_cock_02":[2000,500],"shotgun_cock_03":[4000,679.1836734693879],"shotgun_cock_04":[6000,548.5714285714289],"shotgun_cock_05":[8000,548.571428571428],"shotgun_load_bullet_01":[10000,548.571428571428],"shotgun_load_bullet_02":[12000,522.448979591836],"shotgun_load_bullet_03":[14000,500],"shotgun_load_bullet_04":[16000,500],"shotgun_load_bullet_05":[18000,500],"shotgun_load_bullet_06":[20000,679.1836734693889],"shotgun_load_bullet_07":[22000,548.571428571428],"shotgun_load_bullet_08":[24000,500],"shotgun_shot_01":[26000,2612.244897959183],"shotgun_shot_02":[30000,2507.755102040818],"shotgun_shot_03":[34000,2638.3673469387786],"shotgun_shot_04":[38000,2037.5510204081663]}}''',
    'dig': r'''{"src":["\\sounds\\generatedSprites\\dig.ogg","\\sounds\\generatedSprites\\dig.m4a","\\sounds\\generatedSprites\\dig.mp3","\\sounds\\generatedSprites\\dig.ac3"],"sprite":{"cloth1":[0,1671.8367346938776],"cloth2":[3000,1671.836734693878],"cloth3":[6000,1671.836734693878],"cloth4":[9000,1668.9342403628125],"glass1":[12000,1671.836734693878],"glass2":[15000,1671.8367346938762],"glass3":[18000,1671.8367346938762],"grass1":[21000,500],"grass2":[23000,500],"grass3":[25000,835.9183673469381],"grass4":[27000,835.9183673469381],"gravel1":[29000,500],"gravel2":[31000,500],"gravel3":[33000,500],"gravel4":[35000,500],"pickUp":[37000,500],"sand1":[39000,500],"sand2":[41000,500],"sand3":[43000,500],"sand4":[45000,500],"snow1":[47000,500],"snow2":[49000,500],"snow3":[51000,650.1587301587292],"snow4":[53000,650.1587301587292],"stone1":[55000,500],"stone2":[57000,500],"stone3":[59000,500],"stone4":[61000,500],"wood1":[63000,928.7981859410409],"wood2":[65000,928.7981859410479],"wood3":[67000,928.7981859410479],"wood4":[69000,928.7981859410479]}}''',
    'step': r'''{"src":["\\sounds\\generatedSprites\\step.ogg","\\sounds\\generatedSprites\\step.m4a","\\sounds\\generatedSprites\\step.mp3","\\sounds\\generatedSprites\\step.ac3"],"sprite":{"hit1":[0,557.2789115646258],"hit2":[2000,650.1587301587301],"hit3":[4000,650.1587301587301],"step_cloth1":[6000,1671.836734693878],"step_cloth2":[9000,1671.836734693878],"step_cloth3":[12000,1671.836734693878],"step_cloth4":[15000,1671.8367346938762],"step_grass1":[18000,500],"step_grass2":[20000,500],"step_grass3":[22000,500],"step_grass4":[24000,500],"step_grass5":[26000,1483.1746031746036],"step_gravel1":[29000,1486.0770975056673],"step_gravel2":[32000,1483.1746031746036],"step_gravel3":[35000,1486.077097505671],"step_gravel4":[38000,1486.077097505671],"step_sand2":[41000,1486.077097505671],"step_sand3":[44000,1486.077097505671],"step_sand4":[47000,1486.077097505671],"step_sand5":[50000,1486.077097505671],"step_snow1":[53000,500],"step_snow2":[55000,500],"step_snow3":[57000,500],"step_snow4":[59000,500],"step_stone1":[61000,1486.077097505671],"step_stone2":[64000,1486.077097505671],"step_stone3":[67000,1486.077097505671],"step_stone4":[70000,1486.077097505671],"step_stone5":[73000,1486.077097505671],"step_stone6":[76000,1486.077097505671],"step_wood1":[79000,743.0385487528355],"step_wood2":[81000,743.0385487528355],"step_wood3":[83000,743.0385487528355],"step_wood4":[85000,743.0385487528355],"step_wood5":[87000,743.0385487528355],"step_wood6":[89000,743.0385487528355],"sweep6":[91000,1114.5578231292461]}}''',
    'random': r'''{"src":["\\sounds\\generatedSprites\\random.ogg","\\sounds\\generatedSprites\\random.m4a","\\sounds\\generatedSprites\\random.mp3","\\sounds\\generatedSprites\\random.ac3"],"sprite":{"beep":[0,2455.5102040816328],"bow":[4000,500],"bucketEmpty1":[6000,1114.5578231292513],"bucketEmpty2":[9000,1114.5578231292513],"bucketEmpty3":[12000,1114.5578231292513],"bucketFill1":[15000,1021.678004535147],"bucketFill2":[18000,1021.678004535147],"bucketFill3":[21000,1021.678004535147],"burp":[24000,500],"cannonFire1":[26000,4880.748299319727],"cannonFire2":[32000,4880.748299319727],"cannonFire3":[38000,4880.748299319727],"cashRegister":[44000,3819.682539682539],"chestClose":[49000,557.2789115646231],"chestOpen":[51000,743.0385487528355],"doorClose":[53000,835.9183673469417],"doorClose2":[55000,835.9183673469417],"doorOpen-bloxd1":[57000,743.0385487528355],"doorOpen-bloxd2":[59000,835.9183673469417],"drink":[61000,500],"eat1":[63000,500],"equip_leather1":[65000,928.7981859410479],"exp_collect":[67000,1009.2063492063517],"exp_levelup":[70000,1469.8639455782256],"fallsmall":[73000,1764.7165532879826],"firecracker1":[76000,5302.857142857136],"firecracker2":[83000,5250.612244897965],"firecracker3":[90000,5198.367346938781],"firecracker4":[97000,5877.551020408163],"hoeTill1":[104000,1114.5578231292461],"hoeTill2":[107000,557.2789115646231],"hoeTill3":[109000,928.7981859410479],"hoeTill4":[111000,928.7981859410479],"splash1":[113000,1114.5578231292461],"successfulBowHit":[116000,500],"trapdoorOpen":[118000,835.9183673469346]}}''',
    'mob': r'''{"src":["\\sounds\\generatedSprites\\mob.ogg","\\sounds\\generatedSprites\\mob.m4a","\\sounds\\generatedSprites\\mob.mp3","\\sounds\\generatedSprites\\mob.ac3"],"sprite":{"bearRoar1":[0,1011.1791383219954],"bearRoar2":[3000,793.6507936507935],"bearRoar3":[5000,764.2630385487532],"bearRoar4":[7000,781.9047619047624],"bearRoar5":[9000,646.6666666666665],"catHiss1":[11000,1252.0861678004528],"catHiss2":[14000,1064.240362811791],"catHiss3":[17000,1082.653061224491],"catHiss4":[20000,978.8662131519282],"catHurt1":[22000,809.795918367346],"catHurt2":[24000,779.410430839004],"catHurt3":[26000,626.9387755102046],"catMeow1":[28000,1306.1224489795932],"catMeow2":[31000,1384.4897959183697],"catMeow3":[34000,1280.0000000000011],"catMeow4":[37000,1567.3469387755076],"catMeow5":[40000,1802.448979591837],"cowHurt1":[43000,522.6530612244886],"cowMoo1":[45000,1574.3310657596367],"cowMoo2":[48000,1947.414965986397],"cowMoo3":[51000,2099.3424036281212],"deerGrunt1":[55000,976.7346938775531],"deerHurt1":[57000,500],"dogBark1":[59000,500],"dogBark2":[61000,500],"dogBark3":[63000,500],"dogGrowl1":[65000,634.8979591836752],"dogGrowl2":[67000,543.356009070294],"dogGrowl3":[69000,1361.360544217689],"dogHurt1":[72000,500],"dogHurt2":[74000,500],"golemGrunt1":[76000,6687.346938775505],"golemGrunt2":[84000,4911.020408163267],"gorillaIdle1":[90000,898.1405895691665],"gorillaIdle2":[92000,825.3061224489784],"gorillaIdle3":[94000,1357.2335600907054],"gorillaIdle4":[97000,1061.2698412698478],"gorillaRoar1":[100000,1002.6757369614501],"horseHurt1":[103000,1044.897959183672],"horseHurt2":[106000,1332.2448979591854],"horseIdle1":[109000,1410.6122448979618],"horseIdle2":[112000,634.331065759639],"horseIdle3":[114000,853.4693877550978],"knightGrunt1":[116000,2026.6666666666708],"knightGrunt2":[120000,2154.671201814054],"knightGrunt3":[124000,1674.6712018140643],"pigHurt1":[127000,705.6009070294778],"pigHurt2":[129000,667.4603174603249],"pigHurt3":[131000,500],"pigOink1":[133000,976.7573696145178],"pigOink2":[135000,1015.5782312925226],"pigOink3":[138000,500],"pigOink4":[140000,500],"pigOink5":[142000,519.4557823129173],"sheepBaa1":[144000,1039.387755102041],"sheepBaa2":[147000,1243.9682539682622],"sheepBaa3":[150000,827.7551020408112],"sheepBaa4":[152000,1048.1179138321863],"sheepHurt1":[155000,700.2721088435351],"skeletonRattle1":[157000,1088.0045351474052],"skeletonRattle2":[160000,1499.9773242630283],"skeletonRattle3":[163000,750],"skeletonRattle4":[165000,650.6575963718717],"stagGrunt1":[167000,976.7346938775461],"stagHurt1":[169000,500],"ZombieGrunt1":[171000,2089.795918367344],"ZombieGrunt2":[175000,2351.020408163265],"ZombieGrunt3":[179000,1750.2040816326598],"ZombieHurt1":[182000,1593.469387755107],"ZombieHurt2":[185000,1906.9387755102127],"ZombieHurt3":[188000,1018.7755102040796],"ZombieHurt4":[191000,1358.3673469387634]}}''',
    'note': r'''{"src":["\\sounds\\generatedSprites\\note.ogg","\\sounds\\generatedSprites\\note.m4a","\\sounds\\generatedSprites\\note.mp3","\\sounds\\generatedSprites\\note.ac3"],"sprite":{"bass":[0,500],"bassattack":[2000,500],"bd":[4000,500],"harp_pling":[6000,835.918367346939],"hat":[8000,500],"levelup":[10000,4458.231292517005],"snare":[16000,500]}}''',
    'gameStart': r'''{"src":["\\sounds\\generatedSprites\\gameStart.ogg","\\sounds\\generatedSprites\\gameStart.m4a","\\sounds\\generatedSprites\\gameStart.mp3","\\sounds\\generatedSprites\\gameStart.ac3"],"sprite":{"game_start_countdown_01":[0,1000.7709750566893],"game_start_countdown_02":[3000,994.9206349206347],"game_start_countdown_03":[5000,1000.7709750566889],"game_start_countdown_final":[8000,1583.1065759637183]}}'''
}

BASE_URL = "https://static3.bloxd.io"
OUTPUT_DIR_FULL = "full_audio_sprites"
OUTPUT_DIR_SOUNDS = "sounds"
MARKDOWN_FILE = "sounds_list.md"


def process_sounds():
    """Main function to download, extract all sounds, and generate a markdown list."""
    
    os.makedirs(OUTPUT_DIR_FULL, exist_ok=True)
    os.makedirs(OUTPUT_DIR_SOUNDS, exist_ok=True)
    
    md_content = ["# List of Extracted Sounds\n\n"]
    
    print("--- Starting Sound Downloader and Extractor ---")
    
    for category_name, json_string in SOUND_DATA.items():
        print(f"\nProcessing category: {category_name}")
        
        try:
            data = json.loads(json_string)
            
            mp3_sources = [s for s in data['src'] if s.endswith('.mp3')]
            if not mp3_sources:
                print(f"  - No MP3 source found for {category_name}. Skipping.")
                continue
            
            relative_path = mp3_sources[0].replace('\\', '/')
            full_url = BASE_URL + relative_path
            
            sprite_filename = os.path.basename(relative_path)
            local_sprite_path = os.path.join(OUTPUT_DIR_FULL, sprite_filename)
            
            if not os.path.exists(local_sprite_path):
                print(f"  - Downloading {sprite_filename} from {full_url}")
                try:
                    response = requests.get(full_url, stream=True)
                    response.raise_for_status()
                    with open(local_sprite_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    print(f"  - Download complete: {local_sprite_path}")
                except requests.exceptions.RequestException as e:
                    print(f"  - ERROR: Failed to download {full_url}. Reason: {e}")
                    continue
            else:
                print(f"  - Full audio file already exists: {local_sprite_path}")

            print(f"  - Loading audio sprite for slicing...")
            try:
                full_audio = AudioSegment.from_file(local_sprite_path)
            except Exception as e:
                print(f"  - ERROR: Could not load audio file with pydub. Is FFmpeg installed and in your PATH? Error: {e}")
                continue

            print(f"  - Extracting clips into: {OUTPUT_DIR_SOUNDS}/")
            clip_names = []
            for clip_name, timings in data['sprite'].items():
                start_ms = timings[0]
                duration_ms = timings[1]
                end_ms = start_ms + duration_ms
                
                clip_audio = full_audio[start_ms:end_ms]
                
                clip_filename = f"{clip_name}.mp3"
                clip_path = os.path.join(OUTPUT_DIR_SOUNDS, clip_filename)
                
                clip_audio.export(clip_path, format="mp3")
                clip_names.append(clip_name)

            print(f"  - Finished extracting {len(clip_names)} clips for {category_name}.")

            if clip_names:
                md_content.append(f"### Sounds from `{sprite_filename}`\n\n")
                md_content.append("| Sound Name | Sound Name | Sound Name |\n")
                md_content.append("|:---|:---|:---|\n")
                
                for i in range(0, len(clip_names), 3):
                    row_items = clip_names[i:i+3]
                    formatted_items = [f"`{name}`" for name in row_items]
                    while len(formatted_items) < 3:
                        formatted_items.append("")
                    md_content.append(f"| {' | '.join(formatted_items)} |\n")
                
                md_content.append("\n")

        except json.JSONDecodeError:
            print(f"  - ERROR: Invalid JSON data for {category_name}. Skipping.")
        except Exception as e:
            print(f"  - An unexpected error occurred in category {category_name}: {e}")

    try:
        with open(MARKDOWN_FILE, 'w') as f:
            f.writelines(md_content)
        print(f"\n--- Successfully generated Markdown file: {MARKDOWN_FILE} ---")
    except Exception as e:
        print(f"\n--- ERROR: Could not write Markdown file. Reason: {e} ---")

    print("\n--- All categories processed. ---")

if __name__ == "__main__":
    process_sounds()