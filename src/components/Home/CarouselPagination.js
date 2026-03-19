<<<<<<< HEAD
import { View, StyleSheet, Dimensions, Image, FlatList } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
=======
import { View, StyleSheet, Dimensions, Image } from 'react-native'
import React, { useState } from 'react'
import Carousel, { Pagination } from 'react-native-snap-carousel';
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CarouselPagination = () => {
    const [activeSlide, setActiveSlide] = useState(0);
<<<<<<< HEAD
    const flatListRef = useRef(null);
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
    const data = [
        { image: require('@assets/images/Home/Banner/banner_phone_1.png') },
        { image: require('@assets/images/Home/Banner/banner_phone_2.png') },
        { image: require('@assets/images/Home/Banner/banner_phone_3.png') }
    ];
    const carouselMargin = 8;
<<<<<<< HEAD
    const itemWidth = screenWidth - 2 * carouselMargin;

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveSlide((prev) => {
                const next = (prev + 1) % data.length;
                flatListRef.current?.scrollToIndex({ index: next, animated: true });
                return next;
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setActiveSlide(viewableItems[0].index);
        }
    }).current;

    return (
        <View>
            <FlatList
                ref={flatListRef}
                data={data}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                    <View style={[styles.item, { width: itemWidth }]}>
                        <Image source={item.image} style={styles.image} />
                    </View>
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                style={styles.carouselContainer}
            />
            <View style={styles.paginationContainer}>
                <View style={styles.paginationDotsContainer}>
                    {data.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.paginationDot,
                                { opacity: index === activeSlide ? 1 : 0.4, transform: [{ scale: index === activeSlide ? 1 : 0.6 }] }
                            ]}
                        />
                    ))}
                </View>
=======

    return (
        <View>
            <Carousel
                data={data}
                renderItem={({ item }) => (
                    <View style={styles.item}>
                        <Image source={item.image} style={styles.image} />
                    </View>
                )}
                sliderWidth={screenWidth - 2 * carouselMargin}
                itemWidth={screenWidth - 2 * carouselMargin}
                autoplay={true}
                loop={true}
                autoplayDelay={500}
                autoplayInterval={3000}
                enableMomentum={false}
                lockScrollWhileSnapping={true}
                containerCustomStyle={styles.carouselContainer}
                onSnapToItem={(index) => setActiveSlide(index)}
            />
            <View style={styles.paginationContainer}>
                <Pagination
                    dotsLength={data.length}
                    activeDotIndex={activeSlide}
                    containerStyle={styles.paginationDotsContainer}
                    dotStyle={styles.paginationDot}
                    inactiveDotOpacity={0.4}
                    inactiveDotScale={0.6}
                />
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            </View>
        </View>
    )
}

export default CarouselPagination

const styles = StyleSheet.create({
<<<<<<< HEAD
    item: {
        alignItems: 'center',
    },
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
    image: {
        width: '100%',
        height: screenHeight * 0.20,
        borderRadius: 5,
        borderWidth: 1,
<<<<<<< HEAD
=======
        // resizeMode: 'contain'
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
    },
    carouselContainer: {
        marginHorizontal: 8,
        marginVertical: 20
    },
    paginationContainer: {
        position: 'absolute',
        top: screenHeight * 0.16,
        width: '100%',
        alignItems: 'center',
    },
    paginationDotsContainer: {
        backgroundColor: 'transparent',
        paddingHorizontal: 10,
<<<<<<< HEAD
        flexDirection: 'row',
    },
    paginationDot: {
        width: 8,
=======
    },
    paginationDot: {
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
        height: 8,
        borderRadius: 4,
        marginHorizontal: 6,
        backgroundColor: '#5D5FEE',
    },
});
