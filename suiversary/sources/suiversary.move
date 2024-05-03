module suiversary::suiversary {
    use sui::coin::Coin;
    use sui::sui::SUI;
    use sui::clock::Clock;
    use sui::package;
    use sui::display;
    
    #[allow(lint(coin_field))]
    public struct Suiversary has key, store {
        id: UID,
        coin: Coin<SUI>,
        number: u8,
        minted_timestamp: u64,
    }

    public struct Registry has key {
        id: UID,
        supply: u8,
        pow_supply: u8,
    }

    public struct SuiversaryMintedEvent has copy, store, drop {
        nft_id: ID,
        coin_id: ID,
        sender: address,
        timestamp: u64,
    }

    const MAX_SUPPLY: u8 = 10;
    const MAX_POW_SUPPLY: u8 = 100;

    public struct SUIVERSARY has drop {}

    fun init(otw: SUIVERSARY, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);

        let mut suiversary_display = display::new<Suiversary>(&publisher, ctx);
        suiversary_display.add(b"name".to_string(), b"Suiversary #{number}".to_string());
        suiversary_display.add(b"description".to_string(), b"One year and counting..".to_string());
        suiversary_display.add(b"image_url".to_string(), b"ipfs://bafkreifirsanoskhxukfjqttt7rylthzmwa766xdanrkzl52zz6mslksya".to_string());
        transfer::public_transfer(suiversary_display, ctx.sender());
        transfer::public_transfer(publisher, ctx.sender());

        let registry = Registry {
            id: object::new(ctx),
            supply: 0,
            pow_supply: 0,
        };
        
        transfer::share_object(registry);
    }

    #[allow(lint(self_transfer))]
    public fun mint(registry: &mut Registry, coin: Coin<SUI>, clock: &Clock, ctx: &mut TxContext) {        
        assert!(registry.supply < MAX_SUPPLY, 0);
        registry.supply = registry.supply + 1;

        assert!(coin.value() == 1_000_000_000, 1); // exactly 1 SUI, to mark 1st year anniv

        let coin_id = object::id(&coin);
        let suiversary = Suiversary {
            id: object::new(ctx),
            coin: coin,
            number: registry.supply + registry.pow_supply,
            minted_timestamp: clock.timestamp_ms() / 1000, // in second
        };

        sui::event::emit(SuiversaryMintedEvent {
            nft_id: object::id(&suiversary),
            coin_id: coin_id,
            sender: ctx.sender(),
            timestamp: clock.timestamp_ms() / 1000,
        });
        
        transfer::transfer(suiversary, ctx.sender())
    }

    #[allow(lint(self_transfer))]
    public fun mint_pow(registry: &mut Registry, coin: Coin<SUI>, clock: &Clock, ctx: &mut TxContext) {        
        assert!(registry.supply == MAX_SUPPLY, 1); // only start minting after initial supply is done
        assert!(registry.pow_supply < MAX_POW_SUPPLY, 2);
        registry.pow_supply = registry.pow_supply + 1;

        assert!(coin.value() == 1_000_000_000, 3); // exactly 1 SUI, to mark 1st year anniv
        let coin_id = object::id(&coin);
        proof(&coin_id);

        let suiversary = Suiversary {
            id: object::new(ctx),
            coin: coin,
            number: registry.supply + registry.pow_supply,
            minted_timestamp: clock.timestamp_ms() / 1000, // in second
        };

        sui::event::emit(SuiversaryMintedEvent {
            nft_id: object::id(&suiversary),
            coin_id: coin_id,
            sender: ctx.sender(),
            timestamp: clock.timestamp_ms() / 1000,
        });
        
        transfer::transfer(suiversary, ctx.sender())
    }

    fun proof(id: &ID) {
        let str = &sui::address::to_string(object::id_to_address(id));
        let sub_str = std::string::sub_string(str, 0, 4);
        assert!(std::string::utf8(b"0000") == sub_str, 0);
    }

    #[test]
    fun proof_test() {
        proof(&object::id_from_address(@0x0000888bcc686d9e1db846e8f06f34c9de6059b632970163278fdf6d9777e547));
        proof(&object::id_from_address(@0x0000000bcc686d9e1db846e8f06f34c9de6059b632970163278fdf6d9777e547));
        proof(&object::id_from_address(@0x0000000000686d9e1db846e8f06f34c9de6059b632970163278fdf6d9777e547));
    }

    #[test, expected_failure(abort_code = 0, location = suiversary::suiversary)]
    fun proof_failed_test() {
        proof(&object::id_from_address(@0x1000000bcc686d9e1db846e8f06f34c9de6059b632970163278fdf6d9777e547));
    }
}